/**
 * useCells Hook
 * 셀 목록 및 관리 기능
 */
import { useState, useEffect, useCallback } from 'react';
import { useCellRepository } from '@/di';
import type { Cell, CellMember, MyCellInfo } from '../types';
import type { CreateCellDTO, UpdateCellDTO, AddCellMemberDTO } from '@/domain/repositories/ICellRepository';

interface UseCellsReturn {
  // 데이터
  cells: Cell[];
  myCells: MyCellInfo[];
  loading: boolean;
  error: Error | null;

  // 액션
  refetch: () => Promise<void>;
  createCell: (data: CreateCellDTO) => Promise<Cell>;
  updateCell: (id: string, data: UpdateCellDTO) => Promise<Cell>;
  deleteCell: (id: string) => Promise<void>;
}

export function useCells(): UseCellsReturn {
  const cellRepository = useCellRepository();

  const [cells, setCells] = useState<Cell[]>([]);
  const [myCells, setMyCells] = useState<MyCellInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allCells, userCells] = await Promise.all([
        cellRepository.findAll({ isActive: true }),
        cellRepository.findMyCells(),
      ]);

      setCells(allCells);
      setMyCells(userCells);
    } catch (err) {
      const isNetworkError = err instanceof Error && 'code' in err && (err as { code?: string }).code === 'NETWORK_ERROR';
      if (isNetworkError) {
        console.warn('Failed to fetch cells:', err);
      } else {
        console.error('Failed to fetch cells:', err);
      }
      setError(err instanceof Error ? err : new Error('셀 목록을 불러오는데 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [cellRepository]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createCell = useCallback(
    async (data: CreateCellDTO): Promise<Cell> => {
      const newCell = await cellRepository.create(data);
      setCells((prev) => [...prev, newCell]);
      return newCell;
    },
    [cellRepository]
  );

  const updateCell = useCallback(
    async (id: string, data: UpdateCellDTO): Promise<Cell> => {
      const updated = await cellRepository.update(id, data);
      setCells((prev) => prev.map((cell) => (cell.id === id ? updated : cell)));
      return updated;
    },
    [cellRepository]
  );

  const deleteCell = useCallback(
    async (id: string): Promise<void> => {
      await cellRepository.delete(id);
      setCells((prev) => prev.filter((cell) => cell.id !== id));
    },
    [cellRepository]
  );

  return {
    cells,
    myCells,
    loading,
    error,
    refetch: fetchData,
    createCell,
    updateCell,
    deleteCell,
  };
}

/**
 * useCellDetail Hook
 * 셀 상세 및 구성원 관리
 */
interface UseCellDetailReturn {
  cell: Cell | null;
  members: CellMember[];
  loading: boolean;
  error: Error | null;

  refetch: () => Promise<void>;
  addMember: (data: AddCellMemberDTO) => Promise<CellMember>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: 'LEADER' | 'SUB_LEADER' | 'MEMBER') => Promise<CellMember>;
}

export function useCellDetail(cellId: string | null): UseCellDetailReturn {
  const cellRepository = useCellRepository();

  const [cell, setCell] = useState<Cell | null>(null);
  const [members, setMembers] = useState<CellMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!cellId) {
      setCell(null);
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [cellData, memberData] = await Promise.all([
        cellRepository.findById(cellId),
        cellRepository.getMembers(cellId),
      ]);

      setCell(cellData);
      setMembers(memberData);
    } catch (err) {
      const isNetworkError = err instanceof Error && 'code' in err && (err as { code?: string }).code === 'NETWORK_ERROR';
      if (isNetworkError) {
        console.warn('Failed to fetch cell detail:', err);
      } else {
        console.error('Failed to fetch cell detail:', err);
      }
      setError(err instanceof Error ? err : new Error('셀 정보를 불러오는데 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [cellId, cellRepository]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addMember = useCallback(
    async (data: AddCellMemberDTO): Promise<CellMember> => {
      if (!cellId) throw new Error('셀 ID가 없습니다.');
      const newMember = await cellRepository.addMember(cellId, data);
      setMembers((prev) => [...prev, newMember]);
      return newMember;
    },
    [cellId, cellRepository]
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!cellId) throw new Error('셀 ID가 없습니다.');
      await cellRepository.removeMember(cellId, memberId);
      setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    },
    [cellId, cellRepository]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: 'LEADER' | 'SUB_LEADER' | 'MEMBER'): Promise<CellMember> => {
      if (!cellId) throw new Error('셀 ID가 없습니다.');
      const updated = await cellRepository.updateMember(cellId, memberId, { role });
      setMembers((prev) => prev.map((m) => (m.memberId === memberId ? updated : m)));
      return updated;
    },
    [cellId, cellRepository]
  );

  return {
    cell,
    members,
    loading,
    error,
    refetch: fetchData,
    addMember,
    removeMember,
    updateMemberRole,
  };
}
