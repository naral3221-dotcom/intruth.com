/**
 * Database 유틸리티
 * Prisma 인스턴스 중앙 관리
 */
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * Prisma 클라이언트 싱글톤 인스턴스 반환
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Prisma 연결 해제
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * 트랜잭션 타입 (Prisma Transaction Client)
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
