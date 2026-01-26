import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Filter, MoreHorizontal, Mail, Briefcase } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useTeamStore } from '@/stores/teamStore';
import {
  useTeams,
  useTeamDetail,
} from '@/features/team';
import type { Team, Member } from '@/types';

export function TeamPage() {
  const { openCreateTeamModal, openEditTeamModal, openTeamMemberModal, openConfirmModal, openContextMenu } = useUIStore();
  const { teams, loading: storeLoading, fetchTeams } = useTeamStore();
  const { teams: teamsWithStats, stats, loading: hooksLoading } = useTeams();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 팀 우클릭 핸들러
  const handleTeamContextMenu = useCallback((e: React.MouseEvent, team: Team) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu('team', { x: e.clientX, y: e.clientY }, { team });
  }, [openContextMenu]);

  // 멤버 우클릭 핸들러
  const handleMemberContextMenu = useCallback((e: React.MouseEvent, member: Member, teamId: string) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu('member', { x: e.clientX, y: e.clientY }, {
      member: { member, context: 'team', teamId }
    });
  }, [openContextMenu]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const loading = storeLoading || hooksLoading;

  const selectedTeamWithStats = selectedTeam
    ? teamsWithStats.find((t) => t.id === selectedTeam.id)
    : teamsWithStats[0];

  const { members: teamMembers, removeMember } = useTeamDetail(
    selectedTeamWithStats?.id || null
  );

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedTeamWithStats) return;

    openConfirmModal({
      title: '멤버 제거',
      message: '이 멤버를 팀에서 제거하시겠습니까?',
      variant: 'warning',
      confirmText: '제거',
      onConfirm: async () => {
        await removeMember(memberId);
      },
    });
  };

  // Filter teams based on search
  const filteredTeams = teamsWithStats.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && teams.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">팀</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.totalTeams}개 팀 · {stats.totalMembers}명의 멤버
          </p>
        </div>
        <button
          className="aboard-btn-primary inline-flex items-center gap-2"
          onClick={openCreateTeamModal}
        >
          <Plus className="w-4 h-4" /> 팀 만들기
        </button>
      </header>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="팀 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pr-4 pl-10 border border-border rounded-lg bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <button className="aboard-btn-secondary inline-flex items-center gap-2">
          <Filter className="w-4 h-4" /> 필터
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team List - Left Sidebar */}
        <div className="lg:col-span-1">
          <div className="aboard-card p-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-2 mb-3">팀 목록</h3>
            {filteredTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">팀이 없습니다</p>
              </div>
            ) : (
              filteredTeams.map((team) => (
                <motion.button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  onContextMenu={(e) => handleTeamContextMenu(e, team)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all select-none ${
                    selectedTeamWithStats?.id === team.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
                  whileHover={{ x: 2 }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: team.color || '#00bcd4' }}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.members?.length || 0}명
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Team Detail - Right Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selectedTeamWithStats ? (
              <motion.div
                key={selectedTeamWithStats.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Team Header Card */}
                <div className="aboard-card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm"
                        style={{ backgroundColor: selectedTeamWithStats.color || '#00bcd4' }}
                      >
                        {selectedTeamWithStats.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedTeamWithStats.name}</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                          {selectedTeamWithStats.description || '팀 설명이 없습니다'}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="aboard-badge aboard-badge-info">
                            <Users className="w-3 h-3" />
                            {selectedTeamWithStats.members?.length || 0}명
                          </span>
                          <span className="aboard-badge aboard-badge-success">
                            <Briefcase className="w-3 h-3" />
                            {(selectedTeamWithStats as any).projectCount || (selectedTeamWithStats as any)._count?.projects || 0}개 프로젝트
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openTeamMemberModal(selectedTeamWithStats.id)}
                        className="aboard-btn-primary text-sm"
                      >
                        <Plus className="w-4 h-4" /> 멤버 추가
                      </button>
                      <button
                        onClick={() => openEditTeamModal(selectedTeamWithStats)}
                        className="aboard-btn-secondary text-sm"
                      >
                        수정
                      </button>
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team Members Table */}
                <div className="aboard-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">팀 멤버</h3>
                  </div>
                  {(teamMembers.length > 0 ? teamMembers : selectedTeamWithStats.members || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">멤버가 없습니다</p>
                      <button
                        onClick={() => openTeamMemberModal(selectedTeamWithStats.id)}
                        className="aboard-btn-primary mt-4 text-sm"
                      >
                        <Plus className="w-4 h-4" /> 첫 멤버 추가
                      </button>
                    </div>
                  ) : (
                    <table className="aboard-table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>역할</th>
                          <th>이메일</th>
                          <th>업무</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teamMembers.length > 0 ? teamMembers : selectedTeamWithStats.members || []).map((member: any) => (
                          <tr
                            key={member.id}
                            className="group cursor-pointer select-none"
                            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
                            onContextMenu={(e) => handleMemberContextMenu(e, member, selectedTeamWithStats.id)}
                          >
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium">
                                  {member.name?.charAt(0) || 'M'}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.position || '팀원'}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`aboard-badge ${
                                member.role === 'LEADER' ? 'aboard-badge-warning' : 'aboard-badge-info'
                              }`}>
                                {member.role === 'LEADER' ? '리더' : '멤버'}
                              </span>
                            </td>
                            <td>
                              <a href={`mailto:${member.email}`} className="text-primary hover:underline text-sm">
                                {member.email}
                              </a>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                    {member.taskStats?.inProgress || 0}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                    {member.taskStats?.done || 0}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => window.location.href = `mailto:${member.email}`}
                                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                                  title="이메일 보내기"
                                >
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                                  title="멤버 제거"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="aboard-card flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl widget-icon-blue flex items-center justify-center mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  팀을 선택하세요
                </h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                  왼쪽 목록에서 팀을 선택하거나 새 팀을 만들어 시작하세요.
                </p>
                <button
                  className="aboard-btn-primary"
                  onClick={openCreateTeamModal}
                >
                  <Plus className="w-4 h-4" /> 첫 번째 팀 만들기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
