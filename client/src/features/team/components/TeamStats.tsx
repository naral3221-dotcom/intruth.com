import { Users, UserCheck, Briefcase } from 'lucide-react';
import { AnimatedSection } from '@/presentation/components/effects/AnimatedSection';
import type { StatCardData } from '../types';

interface TeamStatsProps {
  totalMembers: number;
  activeMembers: number;
  roleCount: number;
}

export function TeamStats({ totalMembers, activeMembers, roleCount }: TeamStatsProps) {
  const statCards: StatCardData[] = [
    {
      icon: Users,
      label: '전체',
      value: totalMembers,
      description: '전체 팀원',
      color: 'neon-violet',
      gradient: 'from-neon-violet/20 to-purple-600/10',
    },
    {
      icon: UserCheck,
      label: '활성',
      value: activeMembers,
      description: '업무 진행 중',
      color: 'neon-teal',
      gradient: 'from-neon-teal/20 to-emerald-500/10',
    },
    {
      icon: Briefcase,
      label: '역할',
      value: roleCount,
      description: '등록된 역할',
      color: 'blue-400',
      gradient: 'from-blue-500/20 to-cyan-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {statCards.map((card, index) => (
        <AnimatedSection
          key={card.label}
          animation="scaleIn"
          delay={index * 0.1}
        >
          <div className={`h-[140px] p-5 rounded-xl bg-linear-to-br ${card.gradient} border border-white/10 backdrop-blur-sm`}>
            <div className="w-full h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className={`p-3 bg-${card.color}/20 rounded-xl`}>
                  <card.icon className={`w-6 h-6 text-${card.color}`} />
                </div>
                <span className={`text-xs font-mono text-${card.color} bg-${card.color}/10 px-2 py-1 rounded`}>
                  {card.label}
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">{card.value}</h3>
                <p className="text-gray-400 text-sm">{card.description}</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      ))}
    </div>
  );
}
