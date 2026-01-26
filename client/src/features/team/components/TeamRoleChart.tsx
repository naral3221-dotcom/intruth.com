import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import { FloatingElement } from '@/presentation/components/effects/AnimatedSection';
import type { RoleDistribution } from '../types';

interface TeamRoleChartProps {
  roleDistribution: RoleDistribution[];
  totalMembers: number;
}

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
];

export function TeamRoleChart({ roleDistribution, totalMembers }: TeamRoleChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        <FloatingElement floatIntensity={2} duration={3}>
          <Briefcase className="w-5 h-5 text-primary" />
        </FloatingElement>
        역할 분포
      </h3>
      <div className="flex flex-wrap gap-4">
        {roleDistribution.map((role, index) => {
          const percentage = totalMembers > 0
            ? Math.round((role.count / totalMembers) * 100)
            : 0;
          const color = GRADIENT_COLORS[index % GRADIENT_COLORS.length];

          return (
            <motion.div
              key={role.role}
              className="flex-1 min-w-[200px] p-4 bg-foreground/5 rounded-xl border border-border"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-foreground font-medium">{role.role}</span>
                <span className="text-sm text-muted-foreground">{role.count}명</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-linear-to-r ${color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                />
              </div>
              <div className="mt-2 text-right text-sm text-muted-foreground">
                {percentage}%
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
