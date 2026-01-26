/**
 * Get Members Use Case
 * 멤버 목록 조회 비즈니스 로직
 */
import type { UseCaseNoInput } from '../UseCase';
import type { IMemberRepository, MemberListParams } from '@/domain/repositories/IMemberRepository';
import type { Member } from '@/types';

export class GetMembersUseCase implements UseCaseNoInput<Member[]> {
  constructor(
    private memberRepository: IMemberRepository,
    private params?: MemberListParams
  ) {}

  async execute(): Promise<Member[]> {
    return this.memberRepository.findAll(this.params);
  }
}
