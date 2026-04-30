/**
 * AI Transcription Service
 * 회의 녹음 업로드, 저장, 전사 실행을 담당
 */
import OpenAI, { toFile } from 'openai';
import { PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { IStorageService } from '../storage/IStorageService.js';

type RecordingStatus = 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'FAILED';
type ActionItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface MemberContext {
  id: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface UploadedAudioFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

export interface MeetingMaterialActionItem {
  title: string;
  description: string | null;
  ownerName: string | null;
  dueDate: string | null;
  priority: ActionItemPriority;
}

export interface MeetingMaterials {
  title: string;
  summary: string;
  minutes: string;
  decisions: string[];
  actionItems: MeetingMaterialActionItem[];
  kakaoBrief: string;
  risks: string[];
  followUpQuestions: string[];
}

export interface GenerateMeetingMaterialsOptions {
  recordingId?: number;
  applyToMeeting?: boolean;
  replaceActionItems?: boolean;
}

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/mpga',
  'audio/m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'video/mp4',
]);

const MATERIALS_SECTION_START = '<!-- INTRUTH_AI_MINUTES_START -->';
const MATERIALS_SECTION_END = '<!-- INTRUTH_AI_MINUTES_END -->';

const MEETING_MATERIALS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'summary',
    'minutes',
    'decisions',
    'actionItems',
    'kakaoBrief',
    'risks',
    'followUpQuestions',
  ],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    minutes: { type: 'string' },
    decisions: { type: 'array', items: { type: 'string' } },
    actionItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'ownerName', 'dueDate', 'priority'],
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          ownerName: { type: ['string', 'null'] },
          dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD when explicitly mentioned, otherwise null' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        },
      },
    },
    kakaoBrief: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    followUpQuestions: { type: 'array', items: { type: 'string' } },
  },
} as const;

export class AiTranscriptionService {
  private readonly RECORDING_FOLDER = 'meeting-recordings';

  constructor(
    private prisma: PrismaClient,
    private storageService: IStorageService
  ) {}

  private checkPermission(authorId: string, member: MemberContext): void {
    const isAuthor = authorId === member.id;
    const isAdmin = member.permissions?.system?.manage_settings;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenError('회의 녹음에 접근할 권한이 없습니다.');
    }
  }

  private validateAudioFile(file: UploadedAudioFile): void {
    if (!file) {
      throw new ValidationError('녹음 파일이 없습니다.');
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new ValidationError('녹음 파일은 25MB 이하만 업로드할 수 있습니다.');
    }

    if (!AUDIO_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError('mp3, mp4, m4a, wav, webm 형식의 녹음 파일만 업로드할 수 있습니다.');
    }
  }

  private async findMeetingForMember(meetingId: number, member: MemberContext) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, title: true, authorId: true },
    });

    if (!meeting) {
      throw new NotFoundError('회의자료를 찾을 수 없습니다.');
    }

    this.checkPermission(meeting.authorId, member);
    return meeting;
  }

  async listRecordings(meetingId: number, member: MemberContext) {
    await this.findMeetingForMember(meetingId, member);

    return this.prisma.meetingRecording.findMany({
      where: { meetingId },
      include: {
        segments: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadRecording(meetingId: number, file: UploadedAudioFile, member: MemberContext) {
    this.validateAudioFile(file);
    await this.findMeetingForMember(meetingId, member);

    const upload = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      this.RECORDING_FOLDER
    );

    return this.prisma.meetingRecording.create({
      data: {
        meetingId,
        fileName: upload.fileName,
        storedName: upload.storedName,
        filePath: upload.filePath,
        fileSize: upload.fileSize,
        mimeType: file.mimetype || upload.mimeType,
        oneDriveId: upload.storageType === 'onedrive' ? upload.id : null,
        storageType: upload.storageType,
        createdById: member.id,
        status: 'UPLOADED' satisfies RecordingStatus,
      },
      include: {
        segments: { orderBy: { order: 'asc' } },
      },
    });
  }

  private async findRecordingForMember(recordingId: number, member: MemberContext) {
    const recording = await this.prisma.meetingRecording.findUnique({
      where: { id: recordingId },
      include: {
        meeting: { select: { id: true, title: true, authorId: true } },
        segments: { orderBy: { order: 'asc' } },
      },
    });

    if (!recording) {
      throw new NotFoundError('회의 녹음을 찾을 수 없습니다.');
    }

    this.checkPermission(recording.meeting.authorId, member);
    return recording;
  }

  private buildTranscript(recordings: Array<{
    transcriptText: string | null;
    fileName: string;
    segments: Array<{ speaker: string | null; text: string; startSeconds: number | null }>;
  }>): string {
    return recordings
      .map((recording) => {
        const lines = recording.segments.length > 0
          ? recording.segments.map((segment) => {
              const speaker = segment.speaker ? `${segment.speaker}: ` : '';
              return `${speaker}${segment.text}`.trim();
            })
          : [recording.transcriptText || ''];

        return [`[Recording: ${recording.fileName}]`, ...lines].join('\n');
      })
      .join('\n\n')
      .slice(0, 50000);
  }

  private normalizeMaterials(data: unknown): MeetingMaterials {
    const value = data as Partial<MeetingMaterials>;
    const actionItems = Array.isArray(value.actionItems) ? value.actionItems : [];
    const title = String(value.title || 'AI meeting materials').trim();
    const minutes = String(value.minutes || '').trim();
    const kakaoBrief = String(value.kakaoBrief || '').trim();
    const summary = String(value.summary || kakaoBrief || minutes || title).trim();

    return {
      title,
      summary,
      minutes,
      decisions: Array.isArray(value.decisions) ? value.decisions.map(String).filter(Boolean) : [],
      actionItems: actionItems
        .map((item) => ({
          title: String(item?.title || '').trim(),
          description: item?.description ? String(item.description).trim() : null,
          ownerName: item?.ownerName ? String(item.ownerName).trim() : null,
          dueDate: item?.dueDate ? String(item.dueDate).trim() : null,
          priority: this.normalizePriority(item?.priority),
        }))
        .filter((item) => item.title.length > 0),
      kakaoBrief,
      risks: Array.isArray(value.risks) ? value.risks.map(String).filter(Boolean) : [],
      followUpQuestions: Array.isArray(value.followUpQuestions)
        ? value.followUpQuestions.map(String).filter(Boolean)
        : [],
    };
  }

  private normalizePriority(priority: unknown): ActionItemPriority {
    if (priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH' || priority === 'URGENT') {
      return priority;
    }

    return 'MEDIUM';
  }

  private formatMeetingContent(materials: MeetingMaterials): string {
    const sections = [
      `# ${materials.title}`,
      '## 요약',
      materials.summary,
      '## 회의록',
      materials.minutes,
      '## 결정사항',
      materials.decisions.length ? materials.decisions.map((item) => `- ${item}`).join('\n') : '- 기록된 결정사항 없음',
      '## 할 일',
      materials.actionItems.length
        ? materials.actionItems.map((item) => {
            const owner = item.ownerName ? ` / 담당 제안: ${item.ownerName}` : '';
            const dueDate = item.dueDate ? ` / 기한: ${item.dueDate}` : '';
            const description = item.description ? `\n  - ${item.description}` : '';
            return `- [${item.priority}] ${item.title}${owner}${dueDate}${description}`;
          }).join('\n')
        : '- 기록된 할 일 없음',
      '## 리스크',
      materials.risks.length ? materials.risks.map((item) => `- ${item}`).join('\n') : '- 기록된 리스크 없음',
      '## 후속 질문',
      materials.followUpQuestions.length
        ? materials.followUpQuestions.map((item) => `- ${item}`).join('\n')
        : '- 기록된 후속 질문 없음',
      '## 카카오 공유 요약',
      materials.kakaoBrief,
    ];

    return sections.join('\n\n');
  }

  private mergeGeneratedContent(existingContent: string | null, generatedContent: string): string {
    const block = `${MATERIALS_SECTION_START}\n${generatedContent}\n${MATERIALS_SECTION_END}`;
    const current = existingContent?.trim() || '';
    const generatedBlockPattern = /<!-- INTRUTH_AI_MINUTES_START -->[\s\S]*?<!-- INTRUTH_AI_MINUTES_END -->/;

    if (generatedBlockPattern.test(current)) {
      return current.replace(generatedBlockPattern, block);
    }

    return current ? `${current}\n\n${block}` : block;
  }

  private parseDueDate(value: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private async createMaterialsWithOpenAI(input: {
    meetingTitle: string;
    meetingDate: Date;
    location: string | null;
    existingContent: string | null;
    existingSummary: string | null;
    transcript: string;
  }): Promise<MeetingMaterials> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ValidationError('OPENAI_API_KEY is not configured.');
    }

    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MEETING_MODEL || 'gpt-4o-mini';
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [
            'You create Korean church leadership meeting materials for INTRUTH.',
            'Use a warm but concise ministry tone.',
            'Extract only what is supported by the transcript.',
            'Return an action item for every explicit commitment where someone agreed to do something.',
            'Action item titles must be concrete and start with a verb-like task phrase.',
            'Always write a non-empty one or two sentence summary.',
            'If a due date or owner is unclear, return null for that field.',
            'Do not invent private information or commitments.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Meeting title: ${input.meetingTitle}`,
            `Meeting date: ${input.meetingDate.toISOString()}`,
            `Location: ${input.location || 'N/A'}`,
            `Existing content: ${input.existingContent || 'N/A'}`,
            `Existing summary: ${input.existingSummary || 'N/A'}`,
            'Transcript:',
            input.transcript,
          ].join('\n\n'),
        },
      ],
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'intruth_meeting_materials',
          strict: true,
          schema: MEETING_MATERIALS_SCHEMA,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new ValidationError('AI meeting materials were empty.');
    }

    return this.normalizeMaterials(JSON.parse(outputText));
  }

  async generateMeetingMaterials(
    meetingId: number,
    member: MemberContext,
    options: GenerateMeetingMaterialsOptions = {}
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        actionItems: { select: { title: true } },
      },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting not found.');
    }

    this.checkPermission(meeting.authorId, member);

    const recordings = await this.prisma.meetingRecording.findMany({
      where: {
        meetingId,
        status: 'TRANSCRIBED',
        ...(options.recordingId ? { id: options.recordingId } : {}),
      },
      include: {
        segments: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recordings.length === 0) {
      throw new ValidationError('No transcribed recording is available for this meeting.');
    }

    const transcript = this.buildTranscript(recordings);
    if (!transcript.trim()) {
      throw new ValidationError('Transcript text is empty.');
    }

    const materials = await this.createMaterialsWithOpenAI({
      meetingTitle: meeting.title,
      meetingDate: meeting.meetingDate,
      location: meeting.location,
      existingContent: meeting.content,
      existingSummary: meeting.summary,
      transcript,
    });

    let createdActionItemCount = 0;

    if (options.applyToMeeting !== false) {
      if (options.replaceActionItems) {
        await this.prisma.meetingActionItem.deleteMany({ where: { meetingId } });
      }

      const existingTitles = new Set(
        (options.replaceActionItems ? [] : meeting.actionItems)
          .map((item) => item.title.trim().toLowerCase())
      );
      const actionItemsToCreate = materials.actionItems.filter((item) => {
        const normalizedTitle = item.title.trim().toLowerCase();
        if (existingTitles.has(normalizedTitle)) {
          return false;
        }
        existingTitles.add(normalizedTitle);
        return true;
      });

      await this.prisma.$transaction([
        this.prisma.meeting.update({
          where: { id: meetingId },
          data: {
            summary: materials.summary,
            content: this.mergeGeneratedContent(meeting.content, this.formatMeetingContent(materials)),
            contentType: 'text',
          },
        }),
        ...actionItemsToCreate.map((item) =>
          this.prisma.meetingActionItem.create({
            data: {
              meetingId,
              title: item.title,
              description: [
                item.description,
                item.ownerName ? `담당 제안: ${item.ownerName}` : null,
              ].filter(Boolean).join('\n') || null,
              dueDate: this.parseDueDate(item.dueDate),
              priority: item.priority,
            },
          })
        ),
      ]);

      createdActionItemCount = actionItemsToCreate.length;
    }

    return {
      materials,
      applied: options.applyToMeeting !== false,
      createdActionItemCount,
      recordingCount: recordings.length,
    };
  }

  async transcribeRecording(recordingId: number, member: MemberContext) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ValidationError('OPENAI_API_KEY가 설정되어 있지 않습니다.');
    }

    const recording = await this.findRecordingForMember(recordingId, member);
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe';
    const diarize = model.includes('diarize');
    const openai = new OpenAI({ apiKey });

    await this.prisma.meetingRecording.update({
      where: { id: recording.id },
      data: { status: 'TRANSCRIBING', errorMessage: null },
    });

    try {
      const buffer = await this.storageService.readFile(recording.storedName, this.RECORDING_FOLDER);
      const file = await toFile(buffer, recording.fileName, { type: recording.mimeType });
      const prompt = process.env.OPENAI_TRANSCRIBE_PROMPT ||
        'INTRUTH 교회 리더 회의 녹음입니다. 한국어 회의 내용을 자연스럽게 전사하고, 교회 사역 용어와 이름을 가능한 정확히 보존하세요.';

      const transcript = await openai.audio.transcriptions.create({
        file,
        model,
        response_format: diarize ? 'diarized_json' : 'json',
        ...(diarize ? { chunking_strategy: 'auto' } : { prompt }),
      } as any);

      const transcriptText = typeof transcript === 'string'
        ? transcript
        : (transcript as any).text || '';
      const rawSegments = Array.isArray((transcript as any).segments)
        ? (transcript as any).segments
        : [];

      await this.prisma.meetingTranscriptSegment.deleteMany({
        where: { recordingId: recording.id },
      });

      const segmentData = rawSegments.length > 0
        ? rawSegments.map((segment: any, index: number) => ({
            recordingId: recording.id,
            order: index,
            speaker: segment.speaker ? String(segment.speaker) : null,
            startSeconds: typeof segment.start === 'number' ? segment.start : null,
            endSeconds: typeof segment.end === 'number' ? segment.end : null,
            text: String(segment.text || '').trim(),
            confidence: typeof segment.confidence === 'number' ? segment.confidence : null,
          })).filter((segment: { text: string }) => segment.text.length > 0)
        : [{
            recordingId: recording.id,
            order: 0,
            speaker: null,
            startSeconds: null,
            endSeconds: null,
            text: transcriptText,
            confidence: null,
          }];

      if (segmentData.length > 0) {
        await this.prisma.meetingTranscriptSegment.createMany({
          data: segmentData,
        });
      }

      return this.prisma.meetingRecording.update({
        where: { id: recording.id },
        data: {
          status: 'TRANSCRIBED',
          transcriptText,
          errorMessage: null,
        },
        include: {
          segments: { orderBy: { order: 'asc' } },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '전사 중 오류가 발생했습니다.';
      await this.prisma.meetingRecording.update({
        where: { id: recording.id },
        data: {
          status: 'FAILED',
          errorMessage: message,
        },
      });
      throw error;
    }
  }
}
