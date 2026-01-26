import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';

interface MemberTaskListProps {
  tasks: Task[];
  isExpanded: boolean;
  onTaskClick?: (task: Task) => void;
}

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  TODO: { label: '대기', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: Clock },
  IN_PROGRESS: { label: '진행중', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', icon: Clock },
  REVIEW: { label: '검토', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: AlertCircle },
  DONE: { label: '완료', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2 },
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-500',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-red-500',
};

export function MemberTaskList({ tasks, isExpanded, onTaskClick }: MemberTaskListProps) {
  // 상태별 정렬 (진행중 > 검토 > 대기 > 완료)
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<TaskStatus, number> = { IN_PROGRESS: 0, REVIEW: 1, TODO: 2, DONE: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pl-14 pr-4 py-2 space-y-2">
            {sortedTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4 text-center"
              >
                <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">할당된 업무가 없습니다</p>
              </motion.div>
            ) : (
              sortedTasks.map((task, index) => {
                const status = statusConfig[task.status];
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onTaskClick?.(task)}
                    className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                  >
                    {/* 우선순위 인디케이터 */}
                    <div className={`w-1 h-8 rounded-full ${priorityColors[task.priority]}`} />

                    {/* 상태 아이콘 */}
                    <div className={`p-1.5 rounded-lg ${status.bgColor}`}>
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                    </div>

                    {/* 업무 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate group-hover:text-neon-violet transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${status.color}`}>{status.label}</span>
                        {task.dueDate && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-xs text-gray-500">
                              {new Date(task.dueDate).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                        {task.project && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-xs text-gray-500 truncate max-w-[100px]">
                              {task.project.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 열기 아이콘 */}
                    <ExternalLink className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
