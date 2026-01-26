/**
 * Cell Repository 인터페이스
 * 셀 데이터 접근을 위한 추상화 계층
 */
import type { Cell, CellMember, CellMemberRole, MyCellInfo } from '../entities/Cell';

// DTO (Data Transfer Objects)
export interface CreateCellDTO {
  name: string;
  description?: string;
  color?: string;
  leaderId: string;
}

export interface UpdateCellDTO {
  name?: string;
  description?: string;
  color?: string;
  leaderId?: string;
  isActive?: boolean;
}

export interface CellListParams {
  leaderId?: string;
  isActive?: boolean;
  search?: string;
}

export interface AddCellMemberDTO {
  memberId: string;
  role?: CellMemberRole;
}

export interface UpdateCellMemberDTO {
  role?: CellMemberRole;
  isActive?: boolean;
}

// Repository 인터페이스
export interface ICellRepository {
  // Query methods (조회)
  findAll(params?: CellListParams): Promise<Cell[]>;
  findById(id: string): Promise<Cell>;
  findByLeaderId(leaderId: string): Promise<Cell[]>;
  findMyCells(): Promise<MyCellInfo[]>;

  // Command methods (변경)
  create(data: CreateCellDTO): Promise<Cell>;
  update(id: string, data: UpdateCellDTO): Promise<Cell>;
  delete(id: string): Promise<void>;

  // Member methods (구성원 관리)
  getMembers(cellId: string, includeInactive?: boolean): Promise<CellMember[]>;
  addMember(cellId: string, data: AddCellMemberDTO): Promise<CellMember>;
  updateMember(cellId: string, memberId: string, data: UpdateCellMemberDTO): Promise<CellMember>;
  removeMember(cellId: string, memberId: string): Promise<void>;
}
