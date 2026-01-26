/**
 * Mock Task Repository
 * ITaskRepository 인터페이스를 구현하여 Mock 데이터 제공
 */
import type {
  ITaskRepository,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskListParams,
  UpdateTaskStatusDTO
} from '@/domain/repositories/ITaskRepository';
import type { Task, Comment, ActivityLog, Member, TaskStatus } from '@/types';
import { MockStorage } from './MockStorage';

export class MockTaskRepository implements ITaskRepository {
  private storage = MockStorage.getInstance();

  async findAll(params?: TaskListParams): Promise<Task[]> {
    await this.storage.delay(300);
    let tasks = [...this.storage.tasks];

    if (params?.projectId) {
      tasks = tasks.filter((t) => t.projectId === params.projectId);
    }
    if (params?.status) {
      tasks = tasks.filter((t) => t.status === params.status);
    }
    if (params?.assigneeId) {
      tasks = tasks.filter((t) =>
        t.assignee?.id === params.assigneeId ||
        t.assignees?.some(a => a.id === params.assigneeId)
      );
    }
    if (params?.priority) {
      tasks = tasks.filter((t) => t.priority === params.priority);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    return tasks;
  }

  async findById(id: string): Promise<Task> {
    await this.storage.delay(200);

    // 최상위 task에서 찾기
    const task = this.storage.tasks.find((t) => t.id === id);
    if (task) return task;

    // subtask에서 찾기
    for (const parentTask of this.storage.tasks) {
      if (parentTask.subtasks) {
        const subtask = parentTask.subtasks.find((st) => st.id === id);
        if (subtask) return subtask;
      }
    }

    throw new Error('업무를 찾을 수 없습니다.');
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    return this.findAll({ projectId });
  }

  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    return this.findAll({ assigneeId });
  }

  async create(data: CreateTaskDTO): Promise<Task> {
    await this.storage.delay(300);

    const tasks = this.storage.tasks;
    const projects = this.storage.projects;
    const members = this.storage.members;
    const currentMember = this.storage.getCurrentMember();

    const project = projects.find((p) => p.id === data.projectId);

    // 담당자 처리
    const assigneeIds = data.assigneeIds || [];
    const assignees = assigneeIds
      .map(id => members.find((m) => m.id === id))
      .filter((m): m is Member => m !== undefined);
    const assignee = assignees[0];

    const newTask: Task = {
      id: this.storage.generateId('task'),
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      assignee,
      assignees: assignees.length > 0 ? assignees : undefined,
      reporter: currentMember,
      startDate: data.startDate,
      dueDate: data.dueDate,
      order: tasks.filter((t) => t.status === (data.status || 'TODO')).length,
      folderUrl: data.folderUrl,
      labels: [],
      _count: { subtasks: 0, comments: 0 },
      project: project ? { id: project.id, name: project.name } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 하위 업무인 경우 부모 업무의 subtasks에 추가
    if (data.parentId) {
      const parentTask = tasks.find((t) => t.id === data.parentId);
      if (!parentTask) throw new Error('상위 업무를 찾을 수 없습니다.');

      if (!parentTask.subtasks) {
        parentTask.subtasks = [];
      }
      parentTask.subtasks.push(newTask);
      parentTask._count = {
        subtasks: (parentTask._count?.subtasks || 0) + 1,
        comments: parentTask._count?.comments || 0,
      };
    } else {
      tasks.push(newTask);
    }

    // 활동 로그 생성
    this.storage.addActivity('created', newTask, currentMember);
    this.storage.tasks = tasks;

    return newTask;
  }

  async update(id: string, data: UpdateTaskDTO): Promise<Task> {
    await this.storage.delay(200);

    const tasks = this.storage.tasks;
    const members = this.storage.members;
    const currentMember = this.storage.getCurrentMember();

    // assigneeIds가 있으면 assignees로 변환
    let assignees: Member[] | undefined;
    let assignee: Member | undefined;
    if (data.assigneeIds) {
      assignees = data.assigneeIds
        .map(memberId => members.find((m) => m.id === memberId))
        .filter((m): m is Member => m !== undefined);
      assignee = assignees[0];
    }

    // 최상위 task에서 찾기
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        ...data,
        ...(assignees !== undefined && { assignees, assignee }),
        updatedAt: new Date().toISOString(),
      };

      this.storage.addActivity('updated', tasks[index], currentMember);
      this.storage.tasks = tasks;
      return tasks[index];
    }

    // subtask에서 찾기
    for (const task of tasks) {
      if (task.subtasks) {
        const subtaskIndex = task.subtasks.findIndex((st) => st.id === id);
        if (subtaskIndex !== -1) {
          task.subtasks[subtaskIndex] = {
            ...task.subtasks[subtaskIndex],
            ...data,
            ...(assignees !== undefined && { assignees, assignee }),
            updatedAt: new Date().toISOString(),
          };

          this.storage.addActivity('updated', task.subtasks[subtaskIndex], currentMember);
          this.storage.tasks = tasks;
          return task.subtasks[subtaskIndex];
        }
      }
    }

    throw new Error('업무를 찾을 수 없습니다.');
  }

  async updateStatus(id: string, data: UpdateTaskStatusDTO): Promise<Task> {
    await this.storage.delay(200);

    const tasks = this.storage.tasks;
    const currentMember = this.storage.getCurrentMember();

    // 최상위 task에서 찾기
    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex !== -1) {
      const previousStatus = tasks[taskIndex].status;
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        status: data.status,
        order: data.order ?? tasks[taskIndex].order,
        updatedAt: new Date().toISOString(),
      };

      this.storage.addActivity('moved', tasks[taskIndex], currentMember, {
        from: previousStatus,
        to: data.status,
      });
      this.storage.tasks = tasks;
      return tasks[taskIndex];
    }

    // subtask에서 찾기
    for (const task of tasks) {
      if (task.subtasks) {
        const subtaskIndex = task.subtasks.findIndex((st) => st.id === id);
        if (subtaskIndex !== -1) {
          const previousStatus = task.subtasks[subtaskIndex].status;
          task.subtasks[subtaskIndex] = {
            ...task.subtasks[subtaskIndex],
            status: data.status,
            order: data.order ?? task.subtasks[subtaskIndex].order,
            updatedAt: new Date().toISOString(),
          };

          this.storage.addActivity('moved', task.subtasks[subtaskIndex], currentMember, {
            from: previousStatus,
            to: data.status,
          });
          this.storage.tasks = tasks;
          return task.subtasks[subtaskIndex];
        }
      }
    }

    throw new Error('업무를 찾을 수 없습니다.');
  }

  async updateOrder(id: string, order: number): Promise<Task> {
    await this.storage.delay(100);

    const tasks = this.storage.tasks;
    const index = tasks.findIndex((t) => t.id === id);

    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        order,
        updatedAt: new Date().toISOString(),
      };
      this.storage.tasks = tasks;
      return tasks[index];
    }

    throw new Error('업무를 찾을 수 없습니다.');
  }

  async delete(id: string): Promise<void> {
    await this.storage.delay(200);

    const tasks = this.storage.tasks;
    const currentMember = this.storage.getCurrentMember();

    // 최상위 task에서 찾기
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      const deletedTask = tasks[index];
      tasks.splice(index, 1);
      this.storage.addActivity('deleted', deletedTask, currentMember);
      this.storage.tasks = tasks;
      return;
    }

    // subtask에서 찾기
    for (const task of tasks) {
      if (task.subtasks) {
        const subtaskIndex = task.subtasks.findIndex((st) => st.id === id);
        if (subtaskIndex !== -1) {
          const deletedSubtask = task.subtasks[subtaskIndex];
          task.subtasks.splice(subtaskIndex, 1);
          task._count = {
            subtasks: (task._count?.subtasks || 1) - 1,
            comments: task._count?.comments || 0,
          };
          this.storage.addActivity('deleted', deletedSubtask, currentMember);
          this.storage.tasks = tasks;
          return;
        }
      }
    }

    throw new Error('업무를 찾을 수 없습니다.');
  }

  async deleteMany(ids: string[]): Promise<number> {
    await this.storage.delay(300);

    const tasks = this.storage.tasks;
    const currentMember = this.storage.getCurrentMember();
    let deletedCount = 0;

    for (const id of ids) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index !== -1) {
        const deletedTask = tasks[index];
        tasks.splice(index, 1);
        this.storage.addActivity('deleted', deletedTask, currentMember);
        deletedCount++;
      }
    }

    this.storage.tasks = tasks;
    return deletedCount;
  }

  async updateMany(ids: string[], data: UpdateTaskDTO): Promise<Task[]> {
    await this.storage.delay(300);

    const tasks = this.storage.tasks;
    const members = this.storage.members;
    const currentMember = this.storage.getCurrentMember();
    const updatedTasks: Task[] = [];

    // assigneeIds가 있으면 assignees로 변환
    let assignees: Member[] | undefined;
    let assignee: Member | undefined;
    if (data.assigneeIds) {
      assignees = data.assigneeIds
        .map(memberId => members.find((m) => m.id === memberId))
        .filter((m): m is Member => m !== undefined);
      assignee = assignees[0];
    }

    for (const id of ids) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index !== -1) {
        tasks[index] = {
          ...tasks[index],
          ...data,
          ...(assignees !== undefined && { assignees, assignee }),
          updatedAt: new Date().toISOString(),
        };
        this.storage.addActivity('updated', tasks[index], currentMember);
        updatedTasks.push(tasks[index]);
      }
    }

    this.storage.tasks = tasks;
    return updatedTasks;
  }

  async getComments(taskId: string): Promise<Comment[]> {
    await this.storage.delay(200);
    const task = await this.findById(taskId);
    return task.comments || [];
  }

  async addComment(taskId: string, content: string): Promise<Comment> {
    await this.storage.delay(200);

    const tasks = this.storage.tasks;
    const currentMember = this.storage.getCurrentMember();

    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('업무를 찾을 수 없습니다.');
    }

    const newComment: Comment = {
      id: this.storage.generateId('comment'),
      taskId,
      authorId: currentMember.id,
      content,
      author: currentMember,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!tasks[taskIndex].comments) {
      tasks[taskIndex].comments = [];
    }
    tasks[taskIndex].comments!.push(newComment);
    tasks[taskIndex]._count = {
      subtasks: tasks[taskIndex]._count?.subtasks || 0,
      comments: (tasks[taskIndex]._count?.comments || 0) + 1,
    };

    this.storage.tasks = tasks;
    return newComment;
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await this.storage.delay(200);

    const tasks = this.storage.tasks;
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error('업무를 찾을 수 없습니다.');
    }

    const comments = tasks[taskIndex].comments || [];
    const commentIndex = comments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) {
      throw new Error('댓글을 찾을 수 없습니다.');
    }

    comments.splice(commentIndex, 1);
    tasks[taskIndex].comments = comments;
    tasks[taskIndex]._count = {
      subtasks: tasks[taskIndex]._count?.subtasks || 0,
      comments: Math.max((tasks[taskIndex]._count?.comments || 1) - 1, 0),
    };

    this.storage.tasks = tasks;
  }

  async getSubtasks(taskId: string): Promise<Task[]> {
    await this.storage.delay(200);
    const task = await this.findById(taskId);
    return task.subtasks || [];
  }

  async getActivities(taskId: string): Promise<ActivityLog[]> {
    await this.storage.delay(200);
    const activities = this.storage.activities;
    return activities.filter((a) => a.taskId === taskId);
  }
}
