import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    DndContext,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
    useSensor,
    useSensors,
    PointerSensor,
    closestCorners
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";

import type { Task as SpatialTask } from "@/domain/entities/Task";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

import {
    KanbanHeader,
    KanbanLoading,
    KanbanColumn,
    KanbanTaskCard,
    convertToSpatialTask,
    spatialToStatus,
    DEFAULT_COLUMNS,
} from "@/features/kanban";
import { RoutineStatusBar } from "@/presentation/components/ui/RoutineStatusBar";

export function KanbanBoard() {
    const [columns] = useState(DEFAULT_COLUMNS);
    const { tasks: storeTasks, loading, updateTaskStatus } = useTaskStore();
    const { projects } = useProjectStore();
    const {
        selectedProjectId,
        showAllProjects,
        setSelectedProjectId,
        setShowAllProjects,
        openEditTaskModal,
        openCreateProjectModal
    } = useUIStore();
    const [searchParams, setSearchParams] = useSearchParams();

    // 활성 프로젝트만 필터링
    const activeProjects = useMemo(() => {
        return projects.filter(p => p.status === 'ACTIVE');
    }, [projects]);

    // 첫 로드 시 전체 프로젝트 보기로 설정 (또는 첫 번째 활성 프로젝트 선택)
    useEffect(() => {
        if (!selectedProjectId && !showAllProjects && activeProjects.length > 0) {
            // 기본적으로 전체 프로젝트 보기
            setShowAllProjects(true);
        }
    }, [activeProjects, selectedProjectId, showAllProjects, setShowAllProjects]);

    useEffect(() => {
        const taskId = searchParams.get('taskId');
        if (!taskId || storeTasks.length === 0) return;

        const linkedTask = storeTasks.find((task) => task.id === taskId);
        if (!linkedTask) return;

        openEditTaskModal(linkedTask);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('taskId');
        setSearchParams(nextParams, { replace: true });
    }, [openEditTaskModal, searchParams, setSearchParams, storeTasks]);

    // 선택된 프로젝트에 따라 태스크 필터링
    const filteredStoreTasks = useMemo(() => {
        if (showAllProjects) {
            // 전체 프로젝트 보기: 활성 프로젝트의 태스크만 표시
            const activeProjectIds = new Set(activeProjects.map(p => p.id));
            return storeTasks.filter(task => activeProjectIds.has(task.projectId));
        }
        if (selectedProjectId) {
            // 특정 프로젝트 선택: 해당 프로젝트의 태스크만 표시
            return storeTasks.filter(task => task.projectId === selectedProjectId);
        }
        return [];
    }, [storeTasks, selectedProjectId, showAllProjects, activeProjects]);

    // Store의 tasks를 SpatialTask로 변환
    const tasks = useMemo(() => {
        return filteredStoreTasks.map(convertToSpatialTask);
    }, [filteredStoreTasks]);

    // 드래그 중 로컬 상태
    const [localTasks, setLocalTasks] = useState<SpatialTask[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const displayedTasks = isDragging ? localTasks : tasks;

    const [activeColumn, setActiveColumn] = useState<typeof columns[0] | null>(null);
    const [activeTask, setActiveTask] = useState<SpatialTask | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        })
    );

    const columnIds = useMemo(() => columns.map((col) => col.id), [columns]);

    // Status별 태스크 매핑
    const getTasksByStatus = (status: string): SpatialTask[] => {
        const statusMap: Record<string, SpatialTask['status']> = {
            'TODO': 'todo',
            'IN_PROGRESS': 'in-progress',
            'REVIEW': 'review',
            'DONE': 'done'
        };
        return displayedTasks.filter((t: SpatialTask) => t.status === statusMap[status]);
    };

    // 드래그 핸들러
    const onDragStart = (event: DragStartEvent) => {
        setLocalTasks(tasks);
        setIsDragging(true);
        if (event.active.data.current?.type === "Column") {
            setActiveColumn(event.active.data.current.column);
            return;
        }
        if (event.active.data.current?.type === "Task") {
            setActiveTask(event.active.data.current.task);
            return;
        }
    };

    const onDragEnd = async (event: DragEndEvent) => {
        setActiveColumn(null);
        setActiveTask(null);

        const { active, over } = event;

        // 드래그가 취소된 경우 (over가 없음)
        if (!over) {
            setIsDragging(false);
            return;
        }

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) {
            setIsDragging(false);
            return;
        }

        // 태스크 드래그 완료 시 Store 업데이트
        if (active.data.current?.type === "Task") {
            const task = localTasks.find((t: SpatialTask) => t.id === activeId);
            if (task) {
                const newStatus = spatialToStatus(task.status);
                try {
                    await updateTaskStatus(task.id, newStatus);
                } catch (error) {
                    console.error('Failed to update task status:', error);
                    // 에러 발생 시 localTasks를 store 상태로 복원
                    setLocalTasks(tasks);
                }
            }
        }

        setIsDragging(false);
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === "Task";
        const isOverTask = over.data.current?.type === "Task";
        const isOverColumn = over.data.current?.type === "Column";

        if (!isActiveTask) return;

        // 다른 태스크 위로 드롭
        if (isActiveTask && isOverTask) {
            setLocalTasks((ts: SpatialTask[]) => {
                const activeIndex = ts.findIndex((t: SpatialTask) => t.id === activeId);
                const overIndex = ts.findIndex((t: SpatialTask) => t.id === overId);

                if (ts[activeIndex].status !== ts[overIndex].status) {
                    const newTasks = [...ts];
                    newTasks[activeIndex] = {
                        ...newTasks[activeIndex],
                        status: ts[overIndex].status
                    };
                    return arrayMove(newTasks, activeIndex, overIndex);
                }

                return arrayMove(ts, activeIndex, overIndex);
            });
        }

        // 컬럼 위로 드롭
        if (isActiveTask && isOverColumn) {
            setLocalTasks((ts: SpatialTask[]) => {
                const activeIndex = ts.findIndex((t: SpatialTask) => t.id === activeId);
                const columnId = overId as string;
                const statusMap: Record<string, SpatialTask['status']> = {
                    'TODO': 'todo',
                    'IN_PROGRESS': 'in-progress',
                    'REVIEW': 'review',
                    'DONE': 'done'
                };

                const newTasks = [...ts];
                newTasks[activeIndex] = {
                    ...newTasks[activeIndex],
                    status: statusMap[columnId] || newTasks[activeIndex].status
                };
                return newTasks;
            });
        }
    };

    // 새 프로젝트 추가 핸들러
    const handleAddProject = () => {
        openCreateProjectModal();
    };

    if (loading) {
        return <KanbanLoading />;
    }

    return (
        <motion.div
            className="flex h-full flex-col overflow-hidden p-4 md:p-6 lg:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <KanbanHeader
                projects={projects}
                selectedProjectId={selectedProjectId}
                showAllProjects={showAllProjects}
                onProjectSelect={setSelectedProjectId}
                onShowAllToggle={setShowAllProjects}
                onAddProject={handleAddProject}
                taskCount={displayedTasks.length}
            />

            {/* 루틴 현황 바 */}
            <RoutineStatusBar projectId={showAllProjects ? undefined : (selectedProjectId ?? undefined)} />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
            >
                <motion.div
                    className="flex h-full items-start gap-4 overflow-x-auto pb-4 lg:gap-5 xl:gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <SortableContext items={columnIds}>
                        {columns.map((col, index) => (
                            <motion.div
                                key={col.id}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 100,
                                }}
                            >
                                <KanbanColumn
                                    column={col}
                                    tasks={getTasksByStatus(col.id)}
                                />
                            </motion.div>
                        ))}
                    </SortableContext>
                </motion.div>

                {createPortal(
                    <DragOverlay dropAnimation={{
                        duration: 300,
                        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                    }}>
                        {activeColumn && (
                            <motion.div
                                initial={{ scale: 1, rotate: 0 }}
                                animate={{ scale: 1.02, rotate: 2 }}
                                style={{
                                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                                }}
                            >
                                <KanbanColumn
                                    column={activeColumn}
                                    tasks={getTasksByStatus(activeColumn.id)}
                                />
                            </motion.div>
                        )}
                        {activeTask && (
                            <motion.div
                                initial={{ scale: 1, rotate: 0 }}
                                animate={{ scale: 1.05, rotate: 3 }}
                                style={{
                                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
                                }}
                            >
                                <KanbanTaskCard task={activeTask} />
                            </motion.div>
                        )}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </motion.div>
    );
}
