export interface Member {
  id: string;
  username?: string;
  email: string;
  name: string;
  avatarUrl?: string;
  department?: string;
  position?: string;
  role?: Role;
  userRole?: 'admin' | 'member';  // 시스템 권한
  mustChangePassword?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

// 인증 관련 타입
export interface AuthUser extends Member {
  userRole: 'admin' | 'member';
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  mustChangePassword: boolean;
}

export interface CreateUserInput {
  username: string;
  name: string;
  password?: string;
  email?: string;
  department?: string;
  position?: string;
  role?: 'admin' | 'member';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  role?: 'admin' | 'member';
  isActive?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission;
  isSystem: boolean;
}

export interface Permission {
  project: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_members: boolean;
  };
  task: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    assign: boolean;
  };
  member: {
    view_all: boolean;
    view_workload: boolean;
    manage: boolean;
  };
  system: {
    manage_roles: boolean;
    view_all_stats: boolean;
    manage_settings: boolean;
  };
}

// 프로젝트-팀 담당자 매핑
export interface ProjectTeamAssignment {
  teamId: string;
  team?: Team;
  assigneeIds: string[];
  assignees?: Member[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'ON_HOLD';
  startDate?: string;
  endDate?: string;
  owner?: Member;
  teamId?: string;  // 단일 팀 (하위 호환)
  team?: { id: string; name: string; color: string };  // 단일 팀 (하위 호환)
  teamIds?: string[];  // 다중 팀
  teams?: Team[];  // 다중 팀 정보
  teamAssignments?: ProjectTeamAssignment[];  // 팀별 담당자 매핑
  members?: ProjectMember[];
  labels?: TaskLabel[];
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  memberId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  member: Member;
  joinedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: Member;  // 단일 담당자 (하위 호환)
  assignees?: Member[];  // 다중 담당자
  reporter?: Member;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  order: number;
  parentId?: string;
  folderUrl?: string;
  labels?: { label: TaskLabel }[];
  subtasks?: Task[];
  comments?: Comment[];
  _count?: { subtasks: number; comments: number };
  project?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  author: Member;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  memberId: string;
  action: string;
  details?: Record<string, unknown>;
  member: Member;
  task: { id: string; title: string; project?: { id: string; name: string } };
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  projects: number;
  members: number;
}

export interface TeamProgress {
  id: string;
  name: string;
  avatarUrl?: string;
  department?: string;
  taskStats: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  total: number;
}

// Team (팀) 관련 타입
export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  leaderId?: string;
  leader?: Member;
  createdAt: string;
  updatedAt: string;
}

export type TeamMemberRole = 'LEADER' | 'MEMBER';

export interface TeamMember {
  id: string;
  teamId: string;
  memberId: string;
  role: TeamMemberRole;
  member: Member;
  joinedAt: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  color: string;
  leaderId?: string;
}

// 루틴 업무 관련 타입
export type RepeatType = 'daily' | 'weekly' | 'custom';

export interface RoutineTask {
  id: string;
  title: string;
  description?: string;
  repeatDays: number[];  // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  repeatType: RepeatType;
  projectId?: string;
  project?: { id: string; name: string };
  priority: TaskPriority;
  estimatedMinutes?: number;
  isActive: boolean;
  assignees: Member[];
  isCompletedToday: boolean;
  recentCompletions: RoutineCompletion[];
  createdBy: Member;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineCompletion {
  date: string;
  completedAt: string;
  completedByName: string;
}

export interface CreateRoutineInput {
  title: string;
  description?: string;
  repeatDays: number[];
  repeatType: RepeatType;
  projectId?: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
  assigneeIds?: string[];
}

// ==================== 회의자료 게시판 타입 ====================

export type MeetingStatus = 'DRAFT' | 'PUBLISHED';
export type MeetingContentType = 'text' | 'json';

// 안건 상태
export type AgendaStatus = 'PENDING' | 'DISCUSSED' | 'SKIPPED';

// 액션 아이템 우선순위 및 상태
export type ActionItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ActionItemStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Meeting {
  id: number;
  title: string;
  meetingDate: string;
  location?: string;
  projectId?: number;
  project?: { id: number; name: string };
  content: string;
  contentType?: MeetingContentType;
  summary?: string;
  authorId: number;
  author: Member;
  attendees: MeetingAttendee[];
  attachments?: MeetingAttachment[];
  comments?: MeetingComment[];
  agendas?: MeetingAgenda[];
  actionItems?: MeetingActionItem[];
  status: MeetingStatus;
  _count?: { attachments?: number; comments?: number; agendas?: number; actionItems?: number };
  createdAt: string;
  updatedAt: string;
}

// 안건 (Agenda)
export interface MeetingAgenda {
  id: number;
  meetingId: number;
  order: number;
  title: string;
  description?: string;
  duration?: number; // 예상 소요 시간 (분)
  presenter?: string;
  status: AgendaStatus;
  createdAt: string;
}

// 액션 아이템
export interface MeetingActionItem {
  id: number;
  meetingId: number;
  title: string;
  description?: string;
  assigneeId?: number;
  assignee?: Member;
  dueDate?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingAttendee {
  id: number;
  meetingId: number;
  memberId: number;
  member: Member;
  createdAt: string;
}

export interface MeetingAttachment {
  id: number;
  meetingId: number;
  fileName: string;
  storedName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface MeetingComment {
  id: number;
  meetingId: number;
  authorId: number;
  content: string;
  author: Member;
  createdAt: string;
  updatedAt: string;
}

// 안건 생성 입력
export interface CreateAgendaInput {
  title: string;
  description?: string;
  duration?: number;
  presenter?: string;
  order?: number;
}

// 안건 수정 입력
export interface UpdateAgendaInput {
  title?: string;
  description?: string;
  duration?: number;
  presenter?: string;
  order?: number;
  status?: AgendaStatus;
}

// 액션 아이템 생성 입력
export interface CreateActionItemInput {
  title: string;
  description?: string;
  assigneeId?: number;
  dueDate?: string;
  priority?: ActionItemPriority;
}

// 액션 아이템 수정 입력
export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  assigneeId?: number;
  dueDate?: string;
  priority?: ActionItemPriority;
  status?: ActionItemStatus;
}

export interface CreateMeetingInput {
  title: string;
  meetingDate: string;
  location?: string;
  projectId?: number;
  content: string;
  contentType?: MeetingContentType;
  summary?: string;
  attendeeIds: number[];
  status?: MeetingStatus;
  agendas?: CreateAgendaInput[];
  actionItems?: CreateActionItemInput[];
}

export interface UpdateMeetingInput {
  title?: string;
  meetingDate?: string;
  location?: string;
  projectId?: number;
  content?: string;
  contentType?: MeetingContentType;
  summary?: string;
  attendeeIds?: number[];
  status?: MeetingStatus;
}

export interface MeetingFilters {
  projectId?: number;
  authorId?: number;
  attendeeId?: number;
  status?: MeetingStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}
