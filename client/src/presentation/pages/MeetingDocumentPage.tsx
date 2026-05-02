import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  ClipboardCopy,
  Download,
  Edit,
  FileText,
  FolderKanban,
  Loader2,
  Mic,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useMeetingStore } from '@/stores/meetingStore';
import { useUIStore } from '@/stores/uiStore';
import { toast } from '@/stores/toastStore';
import { cn } from '@/core/utils/cn';
import { shareMeeting } from '@/shared/share/entityShare';
import { generateMeetingPdfFile } from '@/shared/share/meetingPdf';
import { shareFileOrDownload } from '@/shared/share/nativeFileShare';
import type { ShareResult } from '@/shared/share/kakaoShare';

function notifyShareResult(result: ShareResult, downloadedMessage = 'PDF 파일을 내려받았습니다.') {
  if (result === 'kakao' || result === 'native') {
    toast.success('공유 화면을 열었습니다.');
    return;
  }

  if (result === 'copied') {
    toast.success('공유 내용을 복사했습니다.');
    return;
  }

  if (result === 'downloaded') {
    toast.success(downloadedMessage);
    return;
  }

  toast.info('공유를 완료했습니다.');
}

export function MeetingDocumentPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { currentMeeting, loading, fetchMeeting } = useMeetingStore();
  const { openMeetingDetailModal, openEditMeetingModal } = useUIStore();
  const [sharing, setSharing] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const numericMeetingId = Number(meetingId);
  const meeting = currentMeeting?.id === numericMeetingId ? currentMeeting : null;

  useEffect(() => {
    if (!numericMeetingId) return;
    void fetchMeeting(numericMeetingId);
  }, [fetchMeeting, numericMeetingId]);

  const pageUrl = useMemo(() => {
    if (typeof window === 'undefined' || !meeting) return '';
    return `${window.location.origin}/meetings/${meeting.id}`;
  }, [meeting]);

  const meetingDate = meeting ? parseISO(meeting.meetingDate) : null;
  const actionItems = meeting?.actionItems || [];
  const openActionItems = actionItems.filter((item) => item.status !== 'DONE');

  const handleCopyLink = async () => {
    if (!pageUrl) return;
    await navigator.clipboard.writeText(pageUrl);
    toast.success('회의자료 링크를 복사했습니다.');
  };

  const handleShare = async () => {
    if (!meeting) return;

    setSharing(true);
    try {
      notifyShareResult(await shareMeeting(meeting));
    } catch {
      toast.error('회의자료 공유에 실패했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const handlePdfShare = async () => {
    if (!meeting) return;

    setSharingPdf(true);
    try {
      const file = await generateMeetingPdfFile(meeting);
      const result = await shareFileOrDownload({
        file,
        title: meeting.title,
        text: `${meeting.title} 회의자료`,
      });
      notifyShareResult(result);
    } catch {
      toast.error('PDF 공유에 실패했습니다.');
    } finally {
      setSharingPdf(false);
    }
  };

  if (!numericMeetingId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-semibold text-foreground">회의자료 주소가 올바르지 않습니다</p>
        <button type="button" className="aboard-btn-secondary" onClick={() => navigate('/meetings')}>
          회의자료로 돌아가기
        </button>
      </div>
    );
  }

  if (loading && !meeting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>회의자료를 펼치는 중...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-semibold text-foreground">회의자료를 찾을 수 없습니다</p>
        <button type="button" className="aboard-btn-secondary" onClick={() => navigate('/meetings')}>
          회의자료로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl space-y-5 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/meetings" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          회의자료
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="aboard-btn-secondary" onClick={handleCopyLink}>
            <ClipboardCopy className="h-4 w-4" />
            링크 복사
          </button>
          <button type="button" className="aboard-btn-secondary" onClick={() => void handleShare()} disabled={sharing}>
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            카카오 공유
          </button>
          <button type="button" className="aboard-btn-secondary" onClick={() => void handlePdfShare()} disabled={sharingPdf}>
            {sharingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF 보내기
          </button>
          <button type="button" className="aboard-btn-primary" onClick={() => openMeetingDetailModal(meeting)}>
            <Mic className="h-4 w-4" />
            녹음/AI
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={cn(
                'aboard-badge text-[11px]',
                meeting.status === 'PUBLISHED' ? 'aboard-badge-success' : 'aboard-badge-warning'
              )}>
                {meeting.status === 'PUBLISHED' ? '게시됨' : '임시저장'}
              </span>
              {meeting.team && (
                <span className="aboard-badge aboard-badge-info text-[11px]">
                  {meeting.team.name}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-normal text-foreground sm:text-4xl">{meeting.title}</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {meetingDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(meetingDate, 'yyyy년 M월 d일 EEEE HH:mm', { locale: ko })}
                </span>
              )}
              {meeting.project && (
                <span className="inline-flex items-center gap-1">
                  <FolderKanban className="h-4 w-4" />
                  {meeting.project.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                참석 {meeting.attendees.length}명
              </span>
            </div>
          </div>
          <button type="button" className="aboard-btn-secondary shrink-0" onClick={() => openEditMeetingModal(meeting)}>
            <Edit className="h-4 w-4" />
            편집
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                회의 내용
              </h2>
              <div className="min-h-48 rounded-lg border border-border bg-background p-4">
                <div
                  className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: (meeting.content || '').replace(/\n/g, '<br />') }}
                />
              </div>
            </section>

            {meeting.summary && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  요약 / 결정사항
                </h2>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="whitespace-pre-wrap leading-7 text-foreground">{meeting.summary}</p>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-3">
            <section className="rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckSquare className="h-4 w-4 text-primary" />
                연결된 후속 업무
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                AI 초안을 적용하면 액션 아이템을 업무로 전환할 수 있습니다.
              </p>
              <div className="mt-3 space-y-2">
                {openActionItems.length > 0 ? (
                  openActionItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.assignee?.name || '담당자 미정'} · {item.status}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">
                    아직 후속 업무가 없습니다.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">고유 링크</h2>
              <p className="mt-2 break-all rounded-lg bg-card p-3 text-xs text-muted-foreground">{pageUrl}</p>
            </section>
          </aside>
        </div>
      </section>
    </article>
  );
}
