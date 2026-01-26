/**
 * Auth Repository 구현체
 * IAuthRepository 인터페이스를 구현하여 API를 통한 인증 제공
 */
import type { AuthUser } from '@/types';
import type {
  IAuthRepository,
  ITokenManager,
  LoginInput,
  LoginResult,
  ChangePasswordInput
} from '@/domain/repositories/IAuthRepository';
import { AuthApiSource } from '../sources/api/AuthApiSource';
import type { TokenManager } from '../sources/api/HttpClient';

export class AuthRepository implements IAuthRepository {
  public readonly tokenManager: ITokenManager;

  constructor(
    private readonly apiSource: AuthApiSource,
    tokenManager: TokenManager
  ) {
    this.tokenManager = tokenManager;
  }

  async login(input: LoginInput): Promise<LoginResult> {
    return this.apiSource.login(input);
  }

  async logout(): Promise<void> {
    return this.apiSource.logout();
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.apiSource.getCurrentUser();
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    return this.apiSource.changePassword(input);
  }
}
