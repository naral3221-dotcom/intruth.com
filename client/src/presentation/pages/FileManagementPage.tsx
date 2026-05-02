import { Link } from 'react-router-dom';
import {
  Archive,
  FileText,
  FolderKanban,
  Image,
  Mic,
  Upload,
} from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';

const FILE_AREAS = [
  {
    title: '회의자료',
    description: '회의록, PDF 공유본, 녹음 전사 자료를 한 곳에서 찾는 영역입니다.',
    icon: FileText,
    tone: 'bg-cyan-50 text-cyan-700',
    to: '/meetings',
  },
  {
    title: '프로젝트 파일',
    description: '프로젝트별 첨부, 산출물, 참고 링크를 묶어 관리할 예정입니다.',
    icon: FolderKanban,
    tone: 'bg-purple-50 text-purple-700',
    to: '/projects',
  },
  {
    title: '녹음 자료',
    description: '회의 녹음 원본과 전사 상태를 확인하는 보관함으로 확장합니다.',
    icon: Mic,
    tone: 'bg-amber-50 text-amber-700',
    to: '/meetings',
  },
  {
    title: '편집 자료',
    description: '청년부 주보, 이미지 템플릿, 썸네일 제작 도구가 들어올 자리입니다.',
    icon: Image,
    tone: 'bg-rose-50 text-rose-700',
    to: '/files',
    pending: true,
  },
];

export function FileManagementPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">INTRUTH 자료실</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal text-foreground">파일관리</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            지금은 자료 위치를 모아두는 허브로 시작하고, VPS 배포 이후에는 프로젝트 파일 저장소와 주보 편집 도구로 확장합니다.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground"
        >
          <Upload className="h-4 w-4" />
          업로드 준비중
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {FILE_AREAS.map((area) => (
          <Link
            key={area.title}
            to={area.to}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${area.tone}`}>
              <area.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{area.title}</h2>
              {area.pending && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  예정
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.description}</p>
          </Link>
        ))}
      </section>

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">파일관리 1차 범위</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                회의자료와 프로젝트 산출물을 먼저 모으고, 이후 OneDrive 또는 VPS 저장소 정책이 정해지면 실제 업로드와 권한 관리를 붙입니다.
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            저장소 설정 보기
          </Link>
        </div>
      </Card>
    </div>
  );
}
