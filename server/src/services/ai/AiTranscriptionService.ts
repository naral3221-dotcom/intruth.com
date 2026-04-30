/**
 * AI Transcription Service
 * 회의 녹음 업로드, 저장, 전사 실행을 담당
 */
import OpenAI, { toFile } from 'openai';
import { PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { IStorageService } from '../storage/IStorageService.js';

type RecordingStatus = 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'FAILED';

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

export class AiTranscriptionService {
  private readonly RECORDING_FOLDER = 'meeting-recordings';

  constructor(
    private prisma: PrismaClient,
    private storageService: IStorageService
  ) {}

  private checkPermission(authorId: number, member: MemberContext): void {
    const isAuthor = authorId === Number(member.id);
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
        createdById: Number(member.id),
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
