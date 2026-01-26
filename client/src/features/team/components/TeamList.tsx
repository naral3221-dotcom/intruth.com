import { motion } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { FloatingElement } from '@/presentation/components/effects/AnimatedSection';
import { TeamCard } from './TeamCard';
import type { TeamWithMembers } from '../types';
import type { Team } from '@/types';

interface TeamListProps {
  teams: TeamWithMembers[];
  selectedTeam: Team | null;
  loading?: boolean;
  onSelectTeam: (team: Team) => void;
  onCreateTeam: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
}

export function TeamList({
  teams,
  selectedTeam,
  loading,
  onSelectTeam,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
}: TeamListProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <FloatingElement floatIntensity={10} rotateIntensity={3}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-neon-violet border-t-transparent" />
            <p className="text-sm text-gray-400">팀 로딩 중...</p>
          </div>
        </FloatingElement>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">팀 목록</h2>
          <span className="text-sm text-gray-400">{teams.length}개</span>
        </div>
        <button
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90"
          onClick={onCreateTeam}
        >
          <Plus className="w-4 h-4" /> 새 팀 만들기
        </button>
      </div>

      {/* 팀 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {teams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <FloatingElement floatIntensity={8}>
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-500" />
              </div>
            </FloatingElement>
            <p className="text-gray-400 text-center mb-2">아직 팀이 없습니다</p>
            <p className="text-gray-500 text-sm text-center">
              새 팀을 만들어 멤버들을 구성하세요
            </p>
          </motion.div>
        ) : (
          teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TeamCard
                team={team}
                isSelected={selectedTeam?.id === team.id}
                onClick={onSelectTeam}
                onEdit={onEditTeam}
                onDelete={onDeleteTeam}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
