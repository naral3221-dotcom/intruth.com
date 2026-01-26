// Base
export type { UseCase, UseCaseNoInput } from './UseCase';

// Task Use Cases
export {
  GetTasksUseCase,
  CreateTaskUseCase,
  UpdateTaskUseCase,
  DeleteTaskUseCase,
  UpdateTaskStatusUseCase,
  ValidationError as TaskValidationError,
  type UpdateTaskStatusInput,
  type UpdateTaskInput
} from './task';

// Project Use Cases
export {
  GetProjectsUseCase,
  CreateProjectUseCase,
  UpdateProjectUseCase,
  DeleteProjectUseCase,
  ValidationError as ProjectValidationError,
  type ProjectWithTasks,
  type GetProjectsOutput,
  type UpdateProjectInput
} from './project';

// Member Use Cases
export {
  GetMembersUseCase,
  InviteMemberUseCase,
  UpdateMemberUseCase,
  ValidationError as MemberValidationError,
  type UpdateMemberInput
} from './member';

// Team Use Cases
export {
  GetTeamsUseCase,
  CreateTeamUseCase,
  UpdateTeamUseCase,
  DeleteTeamUseCase,
  AddTeamMemberUseCase,
  RemoveTeamMemberUseCase,
  ValidationError as TeamValidationError,
  type UpdateTeamInput,
  type AddTeamMemberInput,
  type RemoveTeamMemberInput
} from './team';

// Dashboard Use Cases
export {
  GetDashboardDataUseCase,
  GetMyTasksUseCase,
  GetRecentActivitiesUseCase
} from './dashboard';
