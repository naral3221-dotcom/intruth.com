/**
 * Invite Member Use Case
 * 멤버 초대 비즈니스 로직
 */
import type { UseCase } from '../UseCase';
import type { IMemberRepository, InviteMemberDTO } from '@/domain/repositories/IMemberRepository';
import type { Member } from '@/types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InviteMemberUseCase implements UseCase<InviteMemberDTO, Member> {
  constructor(private memberRepository: IMemberRepository) {}

  async execute(input: InviteMemberDTO): Promise<Member> {
    // 비즈니스 규칙 검증
    this.validate(input);

    return this.memberRepository.invite(input);
  }

  private validate(input: InviteMemberDTO): void {
    // 필수 필드 검증
    if (!input.email?.trim()) {
      throw new ValidationError('이메일은 필수입니다.');
    }

    if (!input.name?.trim()) {
      throw new ValidationError('이름은 필수입니다.');
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new ValidationError('올바른 이메일 형식이 아닙니다.');
    }

    // 이름 길이 검증
    if (input.name.length > 50) {
      throw new ValidationError('이름은 50자를 초과할 수 없습니다.');
    }
  }
}
