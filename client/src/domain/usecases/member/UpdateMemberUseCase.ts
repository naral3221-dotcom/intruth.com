/**
 * Update Member Use Case
 * 멤버 정보 수정 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { IMemberRepository, UpdateMemberDTO } from '@/domain/repositories/IMemberRepository';
import type { Member } from '@/types';
import { ValidationError } from './InviteMemberUseCase';

export interface UpdateMemberInput {
  memberId: string;
  data: UpdateMemberDTO;
}

export class UpdateMemberUseCase implements UseCase<UpdateMemberInput, Member> {
  constructor(private memberRepository: IMemberRepository) {}

  async execute(input: UpdateMemberInput): Promise<Member> {
    // 비즈니스 규칙 검증
    this.validate(input);

    return this.memberRepository.update(input.memberId, input.data);
  }

  private validate(input: UpdateMemberInput): void {
    // 필수 필드 검증
    if (!input.memberId) {
      throw new ValidationError('멤버 ID는 필수입니다.');
    }

    // 이름 검증 (이름이 있는 경우)
    if (input.data.name !== undefined) {
      if (!input.data.name.trim()) {
        throw new ValidationError('이름은 비워둘 수 없습니다.');
      }
      if (input.data.name.length > 50) {
        throw new ValidationError('이름은 50자를 초과할 수 없습니다.');
      }
    }

    // 이메일 검증 (이메일이 있는 경우)
    if (input.data.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.data.email)) {
        throw new ValidationError('올바른 이메일 형식이 아닙니다.');
      }
    }
  }
}
