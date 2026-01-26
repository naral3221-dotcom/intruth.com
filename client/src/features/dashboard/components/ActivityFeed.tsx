import { motion } from "framer-motion";
import { Activity, Clock, FileEdit, PlusCircle, ArrowRight } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";
import type { ActivityLog } from "@/types";

interface ActivityFeedProps {
    activities: ActivityLog[];
}

const getActionIcon = (action: string) => {
    switch (action) {
        case 'created':
            return PlusCircle;
        case 'updated':
            return FileEdit;
        case 'moved':
            return ArrowRight;
        default:
            return Activity;
    }
};

const getActionText = (action: string) => {
    switch (action) {
        case 'created':
            return '업무를 생성했습니다';
        case 'updated':
            return '업무를 수정했습니다';
        case 'moved':
            return '업무 상태를 변경했습니다';
        default:
            return '활동을 했습니다';
    }
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
    return (
        <div className="aboard-card p-5 h-full">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg widget-icon-blue flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">최근 활동</h3>
                        <p className="text-xs text-muted-foreground">최근 7일</p>
                    </div>
                </div>
            </div>

            {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">최근 활동이 없습니다</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {activities.slice(0, 10).map((activity, i) => {
                        const ActionIcon = getActionIcon(activity.action);
                        return (
                            <motion.div
                                key={activity.id}
                                className="flex gap-3 items-start p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all cursor-pointer"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ x: 2 }}
                            >
                                <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium shrink-0 shadow-sm">
                                    {activity.member.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-foreground font-medium truncate">
                                            {activity.member.name}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {getRelativeTime(activity.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <ActionIcon className="w-3 h-3 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">
                                            {getActionText(activity.action)}
                                        </p>
                                    </div>
                                    <p className="text-sm text-foreground truncate mt-2 bg-card px-3 py-2 rounded-lg border border-border">
                                        {activity.task?.title}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
