import type { Column } from "@/domain/entities/Column";
import type { Task as SpatialTask } from "@/domain/entities/Task";
import type { Task as ApiTask, TaskStatus } from "@/types";

// Re-export types
export type { Column, SpatialTask, ApiTask, TaskStatus };

// Status 매핑 함수
export const statusToSpatial = (status: TaskStatus): SpatialTask['status'] => {
    const map: Record<TaskStatus, SpatialTask['status']> = {
        'TODO': 'todo',
        'IN_PROGRESS': 'in-progress',
        'REVIEW': 'review',
        'DONE': 'done'
    };
    return map[status];
};

export const spatialToStatus = (status: SpatialTask['status']): TaskStatus => {
    const map: Record<SpatialTask['status'], TaskStatus> = {
        'todo': 'TODO',
        'in-progress': 'IN_PROGRESS',
        'review': 'REVIEW',
        'done': 'DONE'
    };
    return map[status];
};

// API Task를 Spatial Task로 변환
export const convertToSpatialTask = (task: ApiTask): SpatialTask => ({
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    content: task.description,
    status: statusToSpatial(task.status),
    priority: (task.priority?.toLowerCase() || 'medium') as SpatialTask['priority'],
    assigneeId: task.assignee?.id,
    assigneeIds: task.assignees?.map(a => a.id) || (task.assignee ? [task.assignee.id] : undefined),
    assignee: task.assignee,
    assignees: task.assignees,
    startDate: task.startDate ? new Date(task.startDate) : undefined,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    tags: task.labels?.map(l => l.label.name) || [],
    createdAt: new Date(task.createdAt),
    project: task.project,
});

// 기본 컬럼 정의
export const DEFAULT_COLUMNS: Column[] = [
    { id: "TODO", projectId: "", title: "할 일", order: 0 },
    { id: "IN_PROGRESS", projectId: "", title: "진행 중", order: 1 },
    { id: "REVIEW", projectId: "", title: "검토", order: 2 },
    { id: "DONE", projectId: "", title: "완료", order: 3 },
];
