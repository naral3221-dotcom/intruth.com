import { Users } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import { FloatingElement, AnimatedList } from '@/presentation/components/effects/AnimatedSection';
import { TeamMemberCard } from './TeamMemberCard';
import type { MemberWithStats } from '../types';
import type { Member } from '@/types';

interface TeamMemberGridProps {
  members: MemberWithStats[];
  onContact?: (member: Member) => void;
  onViewTasks?: (member: Member) => void;
}

export function TeamMemberGrid({ members, onContact, onViewTasks }: TeamMemberGridProps) {
  if (members.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center">
          <FloatingElement floatIntensity={10}>
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
          </FloatingElement>
          <p className="text-muted-foreground text-lg">검색 결과가 없습니다</p>
          <p className="text-muted-foreground text-sm mt-2">다른 검색어나 필터를 시도해 보세요</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatedList
        animation="fadeInUp"
        staggerDelay={0.05}
        className="contents"
      >
        {members.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onContact={onContact}
            onViewTasks={onViewTasks}
          />
        ))}
      </AnimatedList>
    </div>
  );
}
