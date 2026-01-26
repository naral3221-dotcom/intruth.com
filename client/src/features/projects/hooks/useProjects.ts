import { useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTaskStore } from '@/stores/taskStore';
import type { Project, Task } from '@/types';

interface ProjectStats {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    totalTasks: number;
}

export interface ProjectWithTasks extends Project {
    tasks?: Task[];
}

interface UseProjectsReturn {
    projects: ProjectWithTasks[];
    loading: boolean;
    error: string | null;
    stats: ProjectStats;
    refetch: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
    // Zustand store에서 데이터 가져오기
    const { projects: storeProjects, loading: projectsLoading, error: projectsError, fetchProjects } = useProjectStore();
    const { tasks: storeTasks, loading: tasksLoading } = useTaskStore();

    // 프로젝트에 해당 tasks 연결
    const projects = useMemo<ProjectWithTasks[]>(() => {
        return storeProjects.map(project => ({
            ...project,
            tasks: storeTasks.filter(task => task.projectId === project.id),
        }));
    }, [storeProjects, storeTasks]);

    const stats = useMemo<ProjectStats>(() => ({
        total: projects.length,
        active: projects.filter(p => p.status === 'ACTIVE').length,
        completed: projects.filter(p => p.status === 'COMPLETED').length,
        onHold: projects.filter(p => p.status === 'ON_HOLD').length,
        totalTasks: storeTasks.length,
    }), [projects, storeTasks]);

    return {
        projects,
        loading: projectsLoading || tasksLoading,
        error: projectsError,
        stats,
        refetch: fetchProjects,
    };
}
