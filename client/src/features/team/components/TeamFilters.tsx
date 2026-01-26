import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { Card } from '@/presentation/components/ui/Card';
import type { RoleDistribution } from '../types';

interface TeamFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: string | null;
  onRoleFilterChange: (role: string | null) => void;
  roleDistribution: RoleDistribution[];
}

export function TeamFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roleDistribution,
}: TeamFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="이름, 이메일, 부서로 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <div className="flex gap-2 flex-wrap">
            <motion.button
              onClick={() => onRoleFilterChange(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !roleFilter
                  ? 'bg-primary/30 text-primary border border-primary/50'
                  : 'bg-foreground/5 text-muted-foreground border border-border hover:bg-secondary'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              전체
            </motion.button>
            {roleDistribution.map((role) => (
              <motion.button
                key={role.role}
                onClick={() => onRoleFilterChange(roleFilter === role.role ? null : role.role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  roleFilter === role.role
                    ? 'bg-primary/30 text-primary border border-primary/50'
                    : 'bg-foreground/5 text-muted-foreground border border-border hover:bg-secondary'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {role.role} ({role.count})
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
