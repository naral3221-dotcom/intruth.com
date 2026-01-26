/**
 * Get Projects Use Case
 * 프로젝트 목록 조회 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { IProjectRepository, ProjectListParams } from '@/domain/repositories/IProjectRepository';
import type { ITaskRepository } from '@/domain/repositories/ITaskRepository';
import type { Project, Task } from '@/types';

export interface ProjectWithTasks extends Project {
  tasks: Task[];
  taskStats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

export interface GetProjectsOutput {
  projects: ProjectWithTasks[];
  stats: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    archived: number;
    totalTasks: number;
  };
}

export class GetProjectsUseCase implements UseCase<ProjectListParams | undefined, GetProjectsOutput> {
  constructor(
    private projectRepository: IProjectRepository,
    private taskRepository: ITaskRepository
  ) {}

  async execute(params?: ProjectListParams): Promise<GetProjectsOutput> {
    // 프로젝트와 업무를 병렬로 로드
    const [projects, allTasks] = await Promise.all([
      this.projectRepository.findAll(params),
      this.taskRepository.findAll(),
    ]);

    // 프로젝트별 업무 매핑 및 통계 계산
    const projectsWithTasks: ProjectWithTasks[] = projects.map((project) => {
      const projectTasks = allTasks.filter((task) => task.projectId === project.id);

      const taskStats = {
        total: projectTasks.length,
        todo: projectTasks.filter((t) => t.status === 'TODO').length,
        inProgress: projectTasks.filter((t) => t.status === 'IN_PROGRESS').length,
        review: projectTasks.filter((t) => t.status === 'REVIEW').length,
        done: projectTasks.filter((t) => t.status === 'DONE').length,
      };

      return {
        ...project,
        tasks: projectTasks,
        taskStats,
      };
    });

    // 전체 통계 계산
    const stats = {
      total: projects.length,
      active: projects.filter((p) => p.status === 'ACTIVE').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      onHold: projects.filter((p) => p.status === 'ON_HOLD').length,
      archived: projects.filter((p) => p.status === 'ARCHIVED').length,
      totalTasks: allTasks.length,
    };

    return {
      projects: projectsWithTasks,
      stats,
    };
  }
}
