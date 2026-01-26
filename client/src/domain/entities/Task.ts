export interface TaskAssignee {
    id: string;
    name: string;
    email?: string;
    department?: string;
    position?: string;
    avatarUrl?: string;
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    content?: string;
    status: 'todo' | 'in-progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigneeId?: string;  // 단일 담당자 (하위 호환)
    assigneeIds?: string[];  // 다중 담당자
    assignee?: TaskAssignee;  // 단일 담당자 객체
    assignees?: TaskAssignee[];  // 다중 담당자 객체 배열
    startDate?: Date;
    dueDate?: Date;
    tags: string[];
    createdAt: Date;
    project?: { id: string; name: string };  // 프로젝트 정보
}
