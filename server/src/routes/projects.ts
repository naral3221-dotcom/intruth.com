import { Router, Response } from 'express';
import { authenticate, checkPermission, AuthRequest } from '../middleware/auth.js';
import { getProjectService } from '../di/container.js';
import { handleError } from '../shared/errors.js';

const router = Router();

// 프로젝트 목록
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, teamId } = req.query;
    const projectService = getProjectService();

    const projects = await projectService.findAllForMember(req.member!.id, {
      status: status as string,
      teamId: teamId as string,
    });

    res.json(projects);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 생성
router.post('/', authenticate, checkPermission('project.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, startDate, endDate, teamIds } = req.body;
    const projectService = getProjectService();

    const project = await projectService.create({
      name,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      ownerId: req.member!.id,
      teamIds,
    });

    res.status(201).json(project);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 상세
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectService = getProjectService();
    const project = await projectService.findById(req.params.id);
    res.json(project);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 수정
router.put('/:id', authenticate, checkPermission('project.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, status, startDate, endDate, teamIds } = req.body;
    const projectService = getProjectService();

    const project = await projectService.update(req.params.id, {
      name,
      description,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      teamIds,
    });

    res.json(project);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 삭제
router.delete('/:id', authenticate, checkPermission('project.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectService = getProjectService();
    await projectService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 멤버 추가
router.post('/:id/members', authenticate, checkPermission('project.manage_members'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberId, role } = req.body;
    const projectService = getProjectService();

    const projectMember = await projectService.addMember(req.params.id, {
      memberId,
      role,
    });

    res.status(201).json(projectMember);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 멤버 제거
router.delete('/:id/members/:memberId', authenticate, checkPermission('project.manage_members'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectService = getProjectService();
    await projectService.removeMember(req.params.id, req.params.memberId);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 라벨 추가
router.post('/:id/labels', authenticate, checkPermission('project.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    const projectService = getProjectService();

    const label = await projectService.addLabel(req.params.id, { name, color });
    res.status(201).json(label);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 라벨 수정
router.put('/:id/labels/:labelId', authenticate, checkPermission('project.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    const projectService = getProjectService();

    const label = await projectService.updateLabel(req.params.id, req.params.labelId, { name, color });
    res.json(label);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

// 프로젝트 라벨 삭제
router.delete('/:id/labels/:labelId', authenticate, checkPermission('project.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectService = getProjectService();
    await projectService.removeLabel(req.params.id, req.params.labelId);
    res.status(204).send();
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
