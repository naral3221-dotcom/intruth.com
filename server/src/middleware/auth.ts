import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JwtPayload, Permission } from '../types/index.js';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  member?: {
    id: string;
    email: string;
    roleId: string;
    permissions: Permission;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret';

    const decoded = jwt.verify(token, secret) as JwtPayload;

    const member = await prisma.member.findUnique({
      where: { id: decoded.memberId },
      include: { role: true }
    });

    if (!member) {
      res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    req.member = {
      id: member.id,
      email: member.email,
      roleId: member.roleId,
      permissions: member.role.permissions as unknown as Permission
    };

    next();
  } catch (error) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

export const checkPermission = (
  permissionPath: string
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.member) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }

    const [category, action] = permissionPath.split('.');
    const permissions = req.member.permissions as unknown as Record<string, Record<string, boolean>>;

    if (!permissions[category] || !permissions[category][action]) {
      res.status(403).json({ error: '권한이 없습니다.' });
      return;
    }

    next();
  };
};
