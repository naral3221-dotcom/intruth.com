import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getPrismaClient } from '../shared/database.js';
import { handleError, NotFoundError, ValidationError, ForbiddenError } from '../shared/errors.js';

const router = Router();
const prisma = getPrismaClient();

const memberSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
  department: true,
  position: true,
  isActive: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function canManageSystem(req: AuthRequest) {
  return Boolean((req.member?.permissions as unknown as Record<string, Record<string, boolean>> | undefined)?.system?.manage_settings);
}

async function ensureTeamManager(teamId: string, req: AuthRequest) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      leaderId: true,
      members: {
        where: { memberId: req.member!.id, role: 'LEADER' },
        select: { id: true },
      },
    },
  });

  if (!team) throw new NotFoundError('Team not found.');
  if (canManageSystem(req) || team.leaderId === req.member!.id || team.members.length > 0) return;

  throw new ForbiddenError('팀을 관리할 권한이 없습니다.');
}

async function getTeamStats(teamId: string) {
  const memberCount = await prisma.teamMember.count({ where: { teamId } });
  const meetingCount = await prisma.meeting.count({ where: { teamId } });

  return {
    teamId,
    memberCount,
    projectCount: 0,
    meetingCount,
    taskStats: {
      todo: 0,
      inProgress: 0,
      review: 0,
      done: 0,
      total: 0,
    },
  };
}

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, action, search, leaderId } = req.query;

    if (action === 'stats') {
      if (id) {
        res.json(await getTeamStats(String(id)));
        return;
      }

      const teams = await prisma.team.findMany({
        where: canManageSystem(req)
          ? undefined
          : {
              OR: [
                { leaderId: req.member!.id },
                { members: { some: { memberId: req.member!.id } } },
              ],
            },
        select: { id: true },
      });

      res.json(await Promise.all(teams.map((team) => getTeamStats(team.id))));
      return;
    }

    if (action === 'members') {
      if (!id) throw new ValidationError('team id is required.');

      const members = await prisma.teamMember.findMany({
        where: { teamId: String(id) },
        include: { member: { select: memberSelect } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      });

      res.json(members);
      return;
    }

    if (id) {
      const team = await prisma.team.findUnique({
        where: { id: String(id) },
        include: { leader: { select: memberSelect } },
      });

      if (!team) throw new NotFoundError('Team not found.');
      res.json(team);
      return;
    }

    const teams = await prisma.team.findMany({
      where: {
        ...(search ? { name: { contains: String(search), mode: 'insensitive' as const } } : {}),
        ...(leaderId ? { leaderId: String(leaderId) } : {}),
        ...(canManageSystem(req)
          ? {}
          : {
              OR: [
                { leaderId: req.member!.id },
                { members: { some: { memberId: req.member!.id } } },
              ],
            }),
      },
      include: { leader: { select: memberSelect } },
      orderBy: { createdAt: 'asc' },
    });

    res.json(teams);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, action } = req.query;

    if (action === 'member') {
      if (!id) throw new ValidationError('team id is required.');
      const { memberId, role } = req.body;
      if (!memberId) throw new ValidationError('memberId is required.');
      await ensureTeamManager(String(id), req);

      const teamMember = await prisma.teamMember.create({
        data: {
          teamId: String(id),
          memberId: String(memberId),
          role: role || 'MEMBER',
        },
        include: { member: { select: memberSelect } },
      });

      res.status(201).json(teamMember);
      return;
    }

    const { name, description, color, leaderId } = req.body;
    if (!name?.trim()) throw new ValidationError('팀 이름을 입력해주세요.');

    const effectiveLeaderId = leaderId ? String(leaderId) : req.member!.id;
    const team = await prisma.team.create({
      data: {
        name: String(name).trim(),
        description: description || null,
        color: color || '#06b6d4',
        leaderId: effectiveLeaderId,
        members: {
          create: {
            memberId: effectiveLeaderId,
            role: 'LEADER',
          },
        },
      },
      include: { leader: { select: memberSelect } },
    });

    res.status(201).json(team);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

async function updateTeam(req: AuthRequest, res: Response) {
  try {
    const { id, action, memberId } = req.query;
    if (!id) throw new ValidationError('team id is required.');

    if (action === 'member') {
      if (!memberId) throw new ValidationError('member id is required.');
      await ensureTeamManager(String(id), req);

      const updated = await prisma.teamMember.update({
        where: { teamId_memberId: { teamId: String(id), memberId: String(memberId) } },
        data: { role: req.body.role || 'MEMBER' },
        include: { member: { select: memberSelect } },
      });

      res.json(updated);
      return;
    }

    await ensureTeamManager(String(id), req);

    const updated = await prisma.team.update({
      where: { id: String(id) },
      data: {
        name: req.body.name,
        description: req.body.description,
        color: req.body.color,
        leaderId: req.body.leaderId,
      },
      include: { leader: { select: memberSelect } },
    });

    if (req.body.leaderId) {
      await prisma.teamMember.upsert({
        where: { teamId_memberId: { teamId: String(id), memberId: String(req.body.leaderId) } },
        update: { role: 'LEADER' },
        create: { teamId: String(id), memberId: String(req.body.leaderId), role: 'LEADER' },
      });
    }

    res.json(updated);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
}

router.put('/', authenticate, updateTeam);
router.patch('/', authenticate, updateTeam);

router.delete('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, action, memberId } = req.query;
    if (!id) throw new ValidationError('team id is required.');

    if (action === 'member') {
      if (!memberId) throw new ValidationError('member id is required.');
      await ensureTeamManager(String(id), req);
      await prisma.teamMember.delete({
        where: { teamId_memberId: { teamId: String(id), memberId: String(memberId) } },
      });
      res.status(204).send();
      return;
    }

    await ensureTeamManager(String(id), req);
    await prisma.team.delete({ where: { id: String(id) } });
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
