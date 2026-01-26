import { motion } from 'framer-motion';
import { Users, Edit2, Trash2, Crown } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import { useUIStore } from '@/stores/uiStore';
import type { TeamWithMembers } from '../types';
import type { Team } from '@/types';

interface TeamCardProps {
  team: TeamWithMembers;
  isSelected?: boolean;
  onClick?: (team: Team) => void;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
}

export function TeamCard({ team, isSelected, onClick, onEdit, onDelete }: TeamCardProps) {
  const { openContextMenu } = useUIStore();

  const handleClick = () => {
    onClick?.(team);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(team);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(team);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu('team', { x: e.clientX, y: e.clientY }, { team });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="cursor-pointer"
    >
      <Card
        className={`p-4 transition-all ${
          isSelected
            ? 'ring-2 ring-primary bg-primary/10'
            : 'hover:bg-foreground/5'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          {/* 팀 색상 인디케이터 */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${team.color}20` }}
            >
              <Users className="w-5 h-5" style={{ color: team.color }} />
            </div>
            <div>
              <h3 className="text-foreground font-semibold">{team.name}</h3>
              <p className="text-sm text-muted-foreground">{team.memberCount}명</p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1">
            <motion.button
              onClick={handleEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={handleDelete}
              className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* 팀 설명 */}
        {team.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{team.description}</p>
        )}

        {/* 멤버 아바타 */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {team.members.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className="relative"
                style={{ zIndex: team.members.length - index }}
              >
                <div className="w-8 h-8 rounded-full border-2 border-background overflow-hidden">
                  {member.member.avatarUrl ? (
                    <img
                      src={member.member.avatarUrl}
                      alt={member.member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-foreground text-xs font-medium"
                      style={{ backgroundColor: team.color }}
                    >
                      {member.member.name.charAt(0)}
                    </div>
                  )}
                </div>
                {member.role === 'LEADER' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-foreground" />
                  </div>
                )}
              </div>
            ))}
            {team.memberCount > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">+{team.memberCount - 5}</span>
              </div>
            )}
          </div>

          {/* 활성 태스크 수 */}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">활성 업무</span>
            <span className="text-primary font-medium">{team.activeTaskCount}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
