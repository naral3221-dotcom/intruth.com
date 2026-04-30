import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getAiTranscriptionService } from '../di/container.js';
import { handleError, ValidationError } from '../shared/errors.js';

const router = Router();

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function memberContext(req: AuthRequest) {
  return {
    id: req.member!.id,
    permissions: req.member!.permissions as unknown as Record<string, Record<string, boolean>> | undefined,
  };
}

router.get('/meetings/:meetingId/recordings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const recordings = await service.listRecordings(Number(req.params.meetingId), memberContext(req));
    res.json(recordings);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

router.post(
  '/meetings/:meetingId/recordings',
  authenticate,
  audioUpload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        throw new ValidationError('녹음 파일이 없습니다.');
      }

      const service = getAiTranscriptionService();
      const recording = await service.uploadRecording(
        Number(req.params.meetingId),
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        memberContext(req)
      );

      res.status(201).json(recording);
    } catch (error) {
      const { statusCode, body } = handleError(error);
      res.status(statusCode).json(body);
    }
  }
);

router.post('/recordings/:recordingId/transcribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const service = getAiTranscriptionService();
    const recording = await service.transcribeRecording(Number(req.params.recordingId), memberContext(req));
    res.json(recording);
  } catch (error) {
    const { statusCode, body } = handleError(error);
    res.status(statusCode).json(body);
  }
});

export default router;
