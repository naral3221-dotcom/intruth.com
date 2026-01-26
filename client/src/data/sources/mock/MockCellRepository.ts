/**
 * Mock Cell Repository
 * ICellRepository 인터페이스를 구현하여 Mock 데이터 제공
 */
import type {
  ICellRepository,
  CreateCellDTO,
  UpdateCellDTO,
  CellListParams,
  AddCellMemberDTO,
  UpdateCellMemberDTO,
} from '@/domain/repositories/ICellRepository';
import type { Cell, CellMember, MyCellInfo } from '@/domain/entities/Cell';
import { MockStorage } from './MockStorage';

// Mock 셀 데이터
const mockCells: Cell[] = [
  {
    id: 'cell-1',
    name: '청년 1셀',
    description: '청년부 1셀입니다.',
    color: '#3B82F6',
    leaderId: 'member-1',
    leader: {
      id: 'member-1',
      name: '김철수',
      email: 'kim@example.com',
      avatarUrl: undefined,
    },
    isActive: true,
    memberCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cell-2',
    name: '청년 2셀',
    description: '청년부 2셀입니다.',
    color: '#10B981',
    leaderId: 'member-2',
    leader: {
      id: 'member-2',
      name: '이영희',
      email: 'lee@example.com',
      avatarUrl: undefined,
    },
    isActive: true,
    memberCount: 6,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Mock 셀 멤버 데이터
const mockCellMembers: CellMember[] = [
  {
    id: 'cm-1',
    cellId: 'cell-1',
    memberId: 'member-1',
    role: 'LEADER',
    joinedAt: '2024-01-01T00:00:00Z',
    isActive: true,
    member: {
      id: 'member-1',
      name: '김철수',
      email: 'kim@example.com',
      avatarUrl: undefined,
      department: '청년부',
      position: '셀장',
    },
  },
  {
    id: 'cm-2',
    cellId: 'cell-1',
    memberId: 'member-3',
    role: 'SUB_LEADER',
    joinedAt: '2024-01-15T00:00:00Z',
    isActive: true,
    member: {
      id: 'member-3',
      name: '박민수',
      email: 'park@example.com',
      avatarUrl: undefined,
      department: '청년부',
      position: '부셀장',
    },
  },
  {
    id: 'cm-3',
    cellId: 'cell-1',
    memberId: 'member-4',
    role: 'MEMBER',
    joinedAt: '2024-02-01T00:00:00Z',
    isActive: true,
    member: {
      id: 'member-4',
      name: '최지현',
      email: 'choi@example.com',
      avatarUrl: undefined,
      department: '청년부',
      position: '셀원',
    },
  },
];

const STORAGE_KEY = 'workflow_cells';
const MEMBERS_STORAGE_KEY = 'workflow_cell_members';

export class MockCellRepository implements ICellRepository {
  private storage = MockStorage.getInstance();

  private getCells(): Cell[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[MockCellRepository] Failed to load cells:', e);
    }
    return [...mockCells];
  }

  private saveCells(cells: Cell[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
  }

  private getCellMembers(): CellMember[] {
    try {
      const stored = localStorage.getItem(MEMBERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[MockCellRepository] Failed to load cell members:', e);
    }
    return [...mockCellMembers];
  }

  private saveCellMembers(members: CellMember[]): void {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  }

  async findAll(params?: CellListParams): Promise<Cell[]> {
    await this.storage.delay(200);
    let cells = this.getCells();

    if (params?.isActive !== undefined) {
      cells = cells.filter((c) => c.isActive === params.isActive);
    }
    if (params?.leaderId) {
      cells = cells.filter((c) => c.leaderId === params.leaderId);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      cells = cells.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
      );
    }

    return cells;
  }

  async findById(id: string): Promise<Cell> {
    await this.storage.delay(150);
    const cells = this.getCells();
    const cell = cells.find((c) => c.id === id);

    if (!cell) {
      throw new Error('셀을 찾을 수 없습니다.');
    }

    return cell;
  }

  async findByLeaderId(leaderId: string): Promise<Cell[]> {
    return this.findAll({ leaderId });
  }

  async findMyCells(): Promise<MyCellInfo[]> {
    await this.storage.delay(200);
    const currentMember = this.storage.getCurrentMember();
    const cells = this.getCells();
    const cellMembers = this.getCellMembers();

    const myCellMemberships = cellMembers.filter(
      (cm) => cm.memberId === currentMember.id && cm.isActive
    );

    return myCellMemberships.map((membership) => {
      const cell = cells.find((c) => c.id === membership.cellId);
      if (!cell) {
        throw new Error('셀을 찾을 수 없습니다.');
      }
      return {
        ...cell,
        myRole: membership.role,
        joinedAt: membership.joinedAt,
      };
    });
  }

  async create(data: CreateCellDTO): Promise<Cell> {
    await this.storage.delay(300);
    const cells = this.getCells();
    const members = this.storage.members;

    const leader = members.find((m) => m.id === data.leaderId);

    const newCell: Cell = {
      id: this.storage.generateId('cell'),
      name: data.name,
      description: data.description,
      color: data.color || '#3B82F6',
      leaderId: data.leaderId,
      leader: leader
        ? {
            id: leader.id,
            name: leader.name,
            email: leader.email || '',
            avatarUrl: leader.avatarUrl,
          }
        : undefined,
      isActive: true,
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cells.push(newCell);
    this.saveCells(cells);

    return newCell;
  }

  async update(id: string, data: UpdateCellDTO): Promise<Cell> {
    await this.storage.delay(200);
    const cells = this.getCells();
    const index = cells.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error('셀을 찾을 수 없습니다.');
    }

    cells[index] = {
      ...cells[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.saveCells(cells);
    return cells[index];
  }

  async delete(id: string): Promise<void> {
    await this.storage.delay(200);
    const cells = this.getCells();
    const index = cells.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error('셀을 찾을 수 없습니다.');
    }

    cells.splice(index, 1);
    this.saveCells(cells);
  }

  async getMembers(cellId: string, includeInactive = false): Promise<CellMember[]> {
    await this.storage.delay(200);
    const cellMembers = this.getCellMembers();

    return cellMembers.filter(
      (cm) => cm.cellId === cellId && (includeInactive || cm.isActive)
    );
  }

  async addMember(cellId: string, data: AddCellMemberDTO): Promise<CellMember> {
    await this.storage.delay(200);
    const cellMembers = this.getCellMembers();
    const members = this.storage.members;

    const member = members.find((m) => m.id === data.memberId);

    const newCellMember: CellMember = {
      id: this.storage.generateId('cm'),
      cellId,
      memberId: data.memberId,
      role: data.role || 'MEMBER',
      joinedAt: new Date().toISOString(),
      isActive: true,
      member: member
        ? {
            id: member.id,
            name: member.name,
            email: member.email || '',
            avatarUrl: member.avatarUrl,
            department: member.department,
            position: member.position,
          }
        : undefined,
    };

    cellMembers.push(newCellMember);
    this.saveCellMembers(cellMembers);

    // 셀 memberCount 업데이트
    const cells = this.getCells();
    const cellIndex = cells.findIndex((c) => c.id === cellId);
    if (cellIndex !== -1) {
      cells[cellIndex].memberCount = (cells[cellIndex].memberCount || 0) + 1;
      this.saveCells(cells);
    }

    return newCellMember;
  }

  async updateMember(
    cellId: string,
    memberId: string,
    data: UpdateCellMemberDTO
  ): Promise<CellMember> {
    await this.storage.delay(200);
    const cellMembers = this.getCellMembers();
    const index = cellMembers.findIndex(
      (cm) => cm.cellId === cellId && cm.memberId === memberId
    );

    if (index === -1) {
      throw new Error('셀 멤버를 찾을 수 없습니다.');
    }

    cellMembers[index] = {
      ...cellMembers[index],
      ...data,
    };

    this.saveCellMembers(cellMembers);
    return cellMembers[index];
  }

  async removeMember(cellId: string, memberId: string): Promise<void> {
    await this.storage.delay(200);
    const cellMembers = this.getCellMembers();
    const index = cellMembers.findIndex(
      (cm) => cm.cellId === cellId && cm.memberId === memberId
    );

    if (index === -1) {
      throw new Error('셀 멤버를 찾을 수 없습니다.');
    }

    // Soft delete (isActive = false)
    cellMembers[index].isActive = false;
    cellMembers[index].leftAt = new Date().toISOString();
    this.saveCellMembers(cellMembers);

    // 셀 memberCount 업데이트
    const cells = this.getCells();
    const cellIndex = cells.findIndex((c) => c.id === cellId);
    if (cellIndex !== -1) {
      cells[cellIndex].memberCount = Math.max((cells[cellIndex].memberCount || 1) - 1, 0);
      this.saveCells(cells);
    }
  }
}
