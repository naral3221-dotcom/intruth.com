// Repository Interfaces
export type {
  ITaskRepository,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskListParams,
  UpdateTaskStatusDTO
} from './ITaskRepository';

export type {
  IProjectRepository,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectListParams,
  TeamAssignmentDTO,
  AddProjectMemberDTO
} from './IProjectRepository';

export type {
  IMemberRepository,
  InviteMemberDTO,
  UpdateMemberDTO,
  MemberListParams,
  MemberWorkload
} from './IMemberRepository';

export type {
  ITeamRepository,
  CreateTeamDTO,
  UpdateTeamDTO,
  TeamListParams,
  AddTeamMemberDTO,
  TeamStats
} from './ITeamRepository';

export type {
  IDashboardRepository,
  DashboardFilters,
  DashboardData,
  ActivityListParams,
  ProjectProgress
} from './IDashboardRepository';

export type {
  IAuthRepository,
  ITokenManager,
  LoginInput,
  LoginResult,
  ChangePasswordInput
} from './IAuthRepository';

export type {
  IRoutineRepository,
  RoutineListParams,
  UpdateRoutineDTO,
  CompleteResult
} from './IRoutineRepository';

export type {
  IMeetingRepository,
  AddCommentDTO
} from './IMeetingRepository';

export type {
  IAdminRepository,
  CreateUserDTO,
  UpdateUserDTO,
  CreateUserResult
} from './IAdminRepository';
