import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Crown, UserPlus, Mail, UserMinus } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import { FloatingElement } from '@/presentation/components/effects/AnimatedSection';
import { MemberTaskList } from './MemberTaskList';
import type { TeamMemberWithStats } from '../types';
import type { Task } from '@/types';

interface TeamMemberListProps {
  members: TeamMemberWithStats[];
  loading?: boolean;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: string) => void;
  onTaskClick?: (task: Task) => void;
  onMemberContact?: (email: string) => void;
}

export function TeamMemberList({
  members,
  loading,
  onAddMember,
  onRemoveMember,
  onTaskClick,
  onMemberContact,
}: TeamMemberListProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const toggleExpand = (memberId: string) => {
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FloatingElement floatIntensity={10}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </FloatingElement>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">팀원 ({members.length}명)</h3>
        <button
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground"
          onClick={onAddMember}
        >
          <UserPlus className="w-4 h-4" /> 멤버 추가
        </button>
      </div>

      {/* 멤버 목록 */}
      {members.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center">
            <FloatingElement floatIntensity={8}>
              <UserPlus className="w-12 h-12 text-muted-foreground mb-3" />
            </FloatingElement>
            <p className="text-muted-foreground mb-2">아직 팀원이 없습니다</p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90"
              onClick={onAddMember}
            >
              <UserPlus className="w-4 h-4" /> 첫 멤버 추가하기
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member, index) => {
            const isExpanded = expandedMemberId === member.memberId;
            const completionRate =
              member.taskStats.total > 0
                ? Math.round((member.taskStats.done / member.taskStats.total) * 100)
                : 0;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  {/* 멤버 헤더 (클릭하면 확장) */}
                  <div
                    onClick={() => toggleExpand(member.memberId)}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-foreground/5 transition-colors"
                  >
                    {/* 확장 아이콘 */}
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.div>

                    {/* 아바타 */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border">
                        {member.member.avatarUrl ? (
                          <img
                            src={member.member.avatarUrl}
                            alt={member.member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-foreground font-bold">
                            {member.member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      {/* 온라인 상태 */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                          member.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground'
                        }`}
                      />
                      {/* 리더 뱃지 */}
                      {member.role === 'LEADER' && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-foreground" />
                        </div>
                      )}
                    </div>

                    {/* 멤버 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-foreground font-medium truncate">{member.member.name}</h4>
                        {member.role === 'LEADER' && (
                          <span className="text-xs text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                            리더
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.member.position || member.member.department || '팀원'}
                      </p>
                    </div>

                    {/* 업무 통계 */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-primary font-semibold">{member.taskStats.inProgress}</p>
                        <p className="text-xs text-muted-foreground">진행</p>
                      </div>
                      <div className="text-center">
                        <p className="text-emerald-400 font-semibold">{member.taskStats.done}</p>
                        <p className="text-xs text-muted-foreground">완료</p>
                      </div>
                      <div className="text-center">
                        <p className="text-foreground font-semibold">{completionRate}%</p>
                        <p className="text-xs text-muted-foreground">완료율</p>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        onClick={() => onMemberContact?.(member.member.email)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Mail className="w-4 h-4" />
                      </motion.button>
                      {member.role !== 'LEADER' && (
                        <motion.button
                          onClick={() => onRemoveMember?.(member.memberId)}
                          className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <UserMinus className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* 업무 목록 (확장 시) */}
                  <MemberTaskList
                    tasks={member.tasks}
                    isExpanded={isExpanded}
                    onTaskClick={onTaskClick}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
