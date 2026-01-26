import { motion } from 'framer-motion';
import { Mail, CheckCircle2, Clock, AlertCircle, MoreHorizontal } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import type { Member } from '@/types';
import type { MemberWithStats } from '../types';

interface TeamMemberCardProps {
  member: MemberWithStats;
  onContact?: (member: Member) => void;
  onViewTasks?: (member: Member) => void;
}

export function TeamMemberCard({ member, onContact, onViewTasks }: TeamMemberCardProps) {
  const roleBadgeColor = getRoleBadgeColor(member.role?.name || member.position);

  return (
    <Card className="h-[280px] p-0 group">
      <div className="relative w-full h-full p-6 flex flex-col items-center justify-center gap-4">
        {/* Online Status Indicator */}
        <motion.div
          className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
            member.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
          animate={member.isOnline ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Avatar */}
        <div className="relative">
          <motion.div
            className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20"
            whileHover={{ scale: 1.05 }}
          >
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                {member.name.charAt(0)}
              </div>
            )}
          </motion.div>
        </div>

        {/* Name & Role */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">{member.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor}`}
            >
              {member.role?.name || member.position || '팀원'}
            </span>
          </div>
          {member.department && (
            <p className="text-sm text-white/60 mt-1">{member.department}</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-white/60">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{member.taskStats.inProgress}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{member.taskStats.done}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onContact?.(member);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Mail className="w-4 h-4" />
            <span>이메일</span>
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onViewTasks?.(member);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span>업무</span>
          </motion.button>
        </div>
      </div>
    </Card>
  );
}

function getRoleBadgeColor(role?: string): string {
  const roleColors: Record<string, string> = {
    '관리자': 'bg-violet-500/30 text-violet-300 border border-violet-400/30',
    '매니저': 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/30',
    '리더': 'bg-amber-500/30 text-amber-300 border border-amber-400/30',
    '개발자': 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30',
    '디자이너': 'bg-pink-500/30 text-pink-300 border border-pink-400/30',
    '기획자': 'bg-blue-500/30 text-blue-300 border border-blue-400/30',
  };

  return roleColors[role || ''] || 'bg-slate-500/30 text-slate-300 border border-slate-400/30';
}

// Mini card for compact views
export function TeamMemberMiniCard({ member }: { member: MemberWithStats }) {
  return (
    <motion.div
      className="relative flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/8 transition-colors cursor-pointer group overflow-hidden"
      whileTap={{ scale: 0.98 }}
    >
      {/* 왼쪽 바 강조 효과 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-violet to-neon-teal scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top"
      />
      <div className="relative">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
              {member.name.charAt(0)}
            </div>
          )}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
            member.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{member.name}</p>
        <p className="text-xs text-white/50 truncate">{member.position || '팀원'}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-white/60">
        <AlertCircle className="w-3 h-3 text-cyan-400" />
        <span>{member.taskStats.inProgress}</span>
      </div>
    </motion.div>
  );
}
