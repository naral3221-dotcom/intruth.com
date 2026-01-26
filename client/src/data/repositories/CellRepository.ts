/**
 * Cell Repository 구현체
 * ICellRepository 인터페이스를 구현하여 API를 통한 데이터 접근 제공
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
import { CellApiSource } from '../sources/api/CellApiSource';

export class CellRepository implements ICellRepository {
  constructor(private readonly apiSource: CellApiSource) {}

  async findAll(params?: CellListParams): Promise<Cell[]> {
    return this.apiSource.list({
      leaderId: params?.leaderId,
      isActive: params?.isActive,
      search: params?.search,
    });
  }

  async findById(id: string): Promise<Cell> {
    return this.apiSource.get(id);
  }

  async findByLeaderId(leaderId: string): Promise<Cell[]> {
    return this.findAll({ leaderId });
  }

  async findMyCells(): Promise<MyCellInfo[]> {
    return this.apiSource.getMyCells();
  }

  async create(data: CreateCellDTO): Promise<Cell> {
    return this.apiSource.create({
      name: data.name,
      description: data.description,
      color: data.color,
      leaderId: data.leaderId,
    });
  }

  async update(id: string, data: UpdateCellDTO): Promise<Cell> {
    return this.apiSource.update(id, {
      name: data.name,
      description: data.description,
      color: data.color,
      leaderId: data.leaderId,
      isActive: data.isActive,
    });
  }

  async delete(id: string): Promise<void> {
    return this.apiSource.delete(id);
  }

  async getMembers(cellId: string, includeInactive = false): Promise<CellMember[]> {
    return this.apiSource.getMembers(cellId, includeInactive);
  }

  async addMember(cellId: string, data: AddCellMemberDTO): Promise<CellMember> {
    return this.apiSource.addMember(cellId, {
      memberId: data.memberId,
      role: data.role,
    });
  }

  async updateMember(cellId: string, memberId: string, data: UpdateCellMemberDTO): Promise<CellMember> {
    return this.apiSource.updateMember(cellId, memberId, {
      role: data.role,
      isActive: data.isActive,
    });
  }

  async removeMember(cellId: string, memberId: string): Promise<void> {
    return this.apiSource.removeMember(cellId, memberId);
  }
}
