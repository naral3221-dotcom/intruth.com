import { motion } from 'framer-motion';
import { Users, Edit2, Trash2, BarChart3, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import { FloatingElement } from '@/presentation/components/effects/AnimatedSection';
import type { TeamWithMembers } from '../types';
import type { Team } from '@/types';

interface TeamHeaderProps {
  team: TeamWithMembers;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
}

export function TeamHeader({ team, onEdit, onDelete }: TeamHeaderProps) {
  // 팀 전체 통계 계산
  const totalTasks = team.members.reduce((sum, m) => sum + m.taskStats.total, 0);
  const completedTasks = team.members.reduce((sum, m) => sum + m.taskStats.done, 0);
  const inProgressTasks = team.members.reduce((sum, m) => sum + m.taskStats.inProgress, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-start justify-between mb-6">
        {/* 팀 정보 */}
        <div className="flex items-center gap-4">
          <FloatingElement floatIntensity={3} rotateIntensity={2} duration={5}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${team.color}30` }}
            >
              <Users className="w-8 h-8" style={{ color: team.color }} />
            </div>
          </FloatingElement>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">{team.name}</h2>
            <p className="text-muted-foreground">{team.description || '팀 설명이 없습니다.'}</p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground"
            onClick={() => onEdit?.(team)}
          >
            <Edit2 className="w-4 h-4" /> 수정
          </button>
          <button
            className="flex items-center gap-2 p-2 rounded-lg text-red-400 hover:bg-red-500/10"
            onClick={() => onDelete?.(team)}
          >
            <Trash2 className="w-4 h-4" /> 삭제
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 팀원 수 */}
        <motion.div
          className="p-4 bg-foreground/5 rounded-xl border border-border"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-sm text-muted-foreground">팀원</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{team.memberCount}명</p>
        </motion.div>

        {/* 전체 업무 */}
        <motion.div
          className="p-4 bg-foreground/5 rounded-xl border border-border"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-muted-foreground">전체 업무</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalTasks}개</p>
        </motion.div>

        {/* 진행 중 */}
        <motion.div
          className="p-4 bg-foreground/5 rounded-xl border border-border"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm text-muted-foreground">진행 중</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{inProgressTasks}개</p>
        </motion.div>

        {/* 완료율 */}
        <motion.div
          className="p-4 bg-foreground/5 rounded-xl border border-border"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-muted-foreground">완료율</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </Card>
  );
}
