/**
 * Use Case 기본 인터페이스
 * 모든 Use Case는 이 인터페이스를 구현
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * 입력이 없는 Use Case를 위한 인터페이스
 */
export interface UseCaseNoInput<TOutput> {
  execute(): Promise<TOutput>;
}
