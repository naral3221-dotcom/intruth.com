/**
 * Store용 전역 Use Case 인스턴스
 *
 * Zustand Store는 React 컴포넌트 외부에서 실행되므로
 * useXxxRepository() 훅을 사용할 수 없습니다.
 * 대신 storeRepositories에서 생성된 전역 Repository 인스턴스를 사용하여
 * Use Case 인스턴스를 생성합니다.
 */
import {
  taskRepository,
  projectRepository,
  memberRepository,
  teamRepository,
  dashboardRepository,
} from './storeRepositories';

// Task Use Cases
import {
  GetTasksUseCase,
  CreateTaskUseCase,
  UpdateTaskUseCase,
  DeleteTaskUseCase,
  UpdateTaskStatusUseCase,
} from '@/domain/usecases/task';

// Project Use Cases
import {
  GetProjectsUseCase,
  CreateProjectUseCase,
  UpdateProjectUseCase,
  DeleteProjectUseCase,
} from '@/domain/usecases/project';

// Member Use Cases
import {
  GetMembersUseCase,
  InviteMemberUseCase,
  UpdateMemberUseCase,
} from '@/domain/usecases/member';

// Team Use Cases
import {
  GetTeamsUseCase,
  CreateTeamUseCase,
  UpdateTeamUseCase,
  DeleteTeamUseCase,
  AddTeamMemberUseCase,
  RemoveTeamMemberUseCase,
} from '@/domain/usecases/team';

// Dashboard Use Cases
import {
  GetDashboardDataUseCase,
  GetMyTasksUseCase,
  GetRecentActivitiesUseCase,
} from '@/domain/usecases/dashboard';

// Task Use Case 인스턴스
export const getTasksUseCase = new GetTasksUseCase(taskRepository);
export const createTaskUseCase = new CreateTaskUseCase(taskRepository);
export const updateTaskUseCase = new UpdateTaskUseCase(taskRepository);
export const deleteTaskUseCase = new DeleteTaskUseCase(taskRepository);
export const updateTaskStatusUseCase = new UpdateTaskStatusUseCase(taskRepository);

// Project Use Case 인스턴스
export const getProjectsUseCase = new GetProjectsUseCase(projectRepository, taskRepository);
export const createProjectUseCase = new CreateProjectUseCase(projectRepository);
export const updateProjectUseCase = new UpdateProjectUseCase(projectRepository);
export const deleteProjectUseCase = new DeleteProjectUseCase(projectRepository);

// Member Use Case 인스턴스
export const getMembersUseCase = new GetMembersUseCase(memberRepository);
export const inviteMemberUseCase = new InviteMemberUseCase(memberRepository);
export const updateMemberUseCase = new UpdateMemberUseCase(memberRepository);

// Team Use Case 인스턴스
export const getTeamsUseCase = new GetTeamsUseCase(teamRepository);
export const createTeamUseCase = new CreateTeamUseCase(teamRepository);
export const updateTeamUseCase = new UpdateTeamUseCase(teamRepository);
export const deleteTeamUseCase = new DeleteTeamUseCase(teamRepository);
export const addTeamMemberUseCase = new AddTeamMemberUseCase(teamRepository);
export const removeTeamMemberUseCase = new RemoveTeamMemberUseCase(teamRepository);

// Dashboard Use Case 인스턴스
export const getDashboardDataUseCase = new GetDashboardDataUseCase(dashboardRepository);
export const getMyTasksUseCase = new GetMyTasksUseCase(dashboardRepository);
export const getRecentActivitiesUseCase = new GetRecentActivitiesUseCase(dashboardRepository);

// ValidationError 재export (Store에서 에러 처리용)
export { ValidationError as TaskValidationError } from '@/domain/usecases/task';
export { ValidationError as ProjectValidationError } from '@/domain/usecases/project';
export { ValidationError as MemberValidationError } from '@/domain/usecases/member';
export { ValidationError as TeamValidationError } from '@/domain/usecases/team';
