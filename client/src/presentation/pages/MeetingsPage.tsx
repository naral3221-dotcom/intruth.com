import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Paperclip,
  MessageSquare,
  MapPin,
  ChevronDown,
  Clock,
  Share2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useMeetingStore } from "@/stores/meetingStore";
import { useProjectStore } from "@/stores/projectStore";
import { useMemberStore } from "@/stores/memberStore";
import { useUIStore } from "@/stores/uiStore";
import { useContextMenuWithLongPress } from "@/presentation/components/context-menu";
import { LongPressRipple } from "@/presentation/components/ui/LongPressRipple";
import { toast } from "@/stores/toastStore";
import { shareMeeting } from "@/shared/share/entityShare";
import type { ShareResult } from "@/shared/share/kakaoShare";
import type { Meeting, MeetingFilters, MeetingStatus } from "@/types";

export function MeetingsPage() {
  const {
    meetings,
    loading,
    filters,
    fetchMeetings,
    setFilters,
    clearFilters,
    getThisWeekMeetings,
    getThisMonthMeetings,
  } = useMeetingStore();
  const { projects } = useProjectStore();
  const { members } = useMemberStore();
  const {
    openCreateMeetingModal,
    openMeetingDetailModal,
  } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    const meetingId = Number(searchParams.get("meetingId"));
    if (!meetingId || loading || meetings.length === 0) return;

    const linkedMeeting = meetings.find((meeting) => meeting.id === meetingId);
    if (!linkedMeeting) return;

    openMeetingDetailModal(linkedMeeting);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("meetingId");
    setSearchParams(nextParams, { replace: true });
  }, [loading, meetings, openMeetingDetailModal, searchParams, setSearchParams]);

  const notifyShareResult = (result: ShareResult) => {
    if (result === "kakao" || result === "native") {
      toast.success("공유 화면을 열었습니다.");
      return;
    }

    if (result === "copied") {
      toast.success("공유 내용을 복사했습니다.");
      return;
    }

    toast.info("공유를 완료했습니다.");
  };

  const handleShareMeeting = async (meeting: Meeting) => {
    try {
      const result = await shareMeeting(meeting);
      notifyShareResult(result);
    } catch {
      toast.error("회의자료 공유에 실패했습니다.");
    }
  };

  const filteredMeetings = useMemo(() => {
    let result = meetings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.content.toLowerCase().includes(query) ||
          m.summary?.toLowerCase().includes(query)
      );
    }

    if (filters.projectId) {
      result = result.filter((m) => m.projectId === filters.projectId);
    }

    if (filters.authorId) {
      result = result.filter((m) => m.authorId === filters.authorId);
    }

    if (filters.status) {
      result = result.filter((m) => m.status === filters.status);
    }

    return result;
  }, [meetings, searchQuery, filters]);

  const stats = useMemo(() => {
    const thisWeek = getThisWeekMeetings();
    const thisMonth = getThisMonthMeetings();
    return {
      total: meetings.length,
      thisWeek: thisWeek.length,
      thisMonth: thisMonth.length,
      published: meetings.filter((m) => m.status === "PUBLISHED").length,
      draft: meetings.filter((m) => m.status === "DRAFT").length,
    };
  }, [meetings, getThisWeekMeetings, getThisMonthMeetings]);

  const handleFilterChange = (key: keyof MeetingFilters, value: string | undefined) => {
    setFilters({
      ...filters,
      [key]: value || undefined,
    });
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">회의자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">회의</h1>
          <p className="text-muted-foreground text-sm mt-1">
            총 {stats.total}개 · 이번주 {stats.thisWeek}건
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMeetings()}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="aboard-btn-primary inline-flex items-center gap-2"
            onClick={openCreateMeetingModal}
          >
            <Plus className="w-4 h-4" /> 새 회의
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-blue flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">전체</p>
            </div>
          </div>
        </div>
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-green flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">이번주</p>
            </div>
          </div>
        </div>
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-purple flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">이번달</p>
            </div>
          </div>
        </div>
        <div className="aboard-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl widget-icon-orange flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">임시저장</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="회의자료 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pr-4 pl-10 border border-border rounded-lg bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`aboard-btn-secondary inline-flex items-center gap-2 ${
            showFilters ? "bg-primary/10 border-primary text-primary" : ""
          }`}
        >
          <Filter className="w-4 h-4" />
          필터
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="aboard-card p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">프로젝트</label>
              <select
                value={filters.projectId || ""}
                onChange={(e) => handleFilterChange("projectId", e.target.value)}
                className="aboard-input"
              >
                <option value="">전체</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">작성자</label>
              <select
                value={filters.authorId || ""}
                onChange={(e) => handleFilterChange("authorId", e.target.value)}
                className="aboard-input"
              >
                <option value="">전체</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">상태</label>
              <select
                value={filters.status || ""}
                onChange={(e) => handleFilterChange("status", e.target.value as MeetingStatus | "")}
                className="aboard-input"
              >
                <option value="">전체</option>
                <option value="PUBLISHED">게시됨</option>
                <option value="DRAFT">임시저장</option>
              </select>
            </div>
          </div>
          {(filters.projectId || filters.authorId || filters.status) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-primary hover:underline"
            >
              필터 초기화
            </button>
          )}
        </motion.div>
      )}

      {/* Meeting List */}
      <div className="aboard-card overflow-hidden">
        {filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm mb-1">
              {searchQuery || filters.projectId || filters.authorId || filters.status
                ? "검색 결과가 없습니다"
                : "등록된 회의자료가 없습니다"}
            </p>
            {!searchQuery && !filters.projectId && !filters.authorId && !filters.status && (
              <button
                className="aboard-btn-primary mt-4"
                onClick={openCreateMeetingModal}
              >
                <Plus className="w-4 h-4" /> 새 회의자료 작성
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredMeetings.map((meeting, index) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                index={index}
                onClick={() => openMeetingDetailModal(meeting)}
                onShare={() => void handleShareMeeting(meeting)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Meeting Card Component
interface MeetingCardProps {
  meeting: Meeting;
  index: number;
  onClick: () => void;
  onShare: () => void;
}

function MeetingCard({ meeting, index, onClick, onShare }: MeetingCardProps) {
  const meetingDate = parseISO(meeting.meetingDate);

  // 우클릭 / Long Press 지원
  const { contextMenuProps, isLongPressing, ripplePosition } = useContextMenuWithLongPress({
    type: 'meeting',
    data: { meeting },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors group relative overflow-hidden select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      {...contextMenuProps}
    >
      <LongPressRipple isActive={isLongPressing} position={ripplePosition} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title & Status */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {meeting.title}
            </h3>
            {meeting.status === "DRAFT" && (
              <span className="aboard-badge aboard-badge-warning text-[10px]">
                임시저장
              </span>
            )}
          </div>

          {/* Date & Location */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(meetingDate, "M월 d일 (EEE) HH:mm", { locale: ko })}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {meeting.location}
              </span>
            )}
          </div>

          {/* Attendees */}
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              {meeting.attendees.slice(0, 5).map((attendee) => (
                <div
                  key={attendee.id}
                  className="w-7 h-7 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-medium text-white ring-2 ring-card"
                  title={attendee.member.name}
                >
                  {attendee.member.avatarUrl ? (
                    <img
                      src={attendee.member.avatarUrl}
                      alt={attendee.member.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    attendee.member.name.charAt(0)
                  )}
                </div>
              ))}
              {meeting.attendees.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-card">
                  +{meeting.attendees.length - 5}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {meeting.attendees.length}명
            </span>

            {/* Project Badge */}
            {meeting.project && (
              <span className="aboard-badge aboard-badge-info text-[10px] ml-2">
                {meeting.project.name}
              </span>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {(meeting._count?.attachments ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-4 h-4" />
              {meeting._count?.attachments}
            </span>
          )}
          {(meeting._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {meeting._count?.comments}
            </span>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShare();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
            title="카카오 공유"
            aria-label="카카오 공유"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
