import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DI Container 초기화 (라우트 import 전에 실행)
import { container } from './di/container.js';
container.initialize();

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import memberRoutes from './routes/members.js';
import dashboardRoutes from './routes/dashboard.js';
import meetingRoutes from './routes/meetings.js';
import onedriveRoutes from './routes/onedrive.js';
import cellRoutes from './routes/cells.js';
import attendanceRoutes from './routes/attendance.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 정적 파일 서빙 (첨부파일)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/onedrive', onedriveRoutes);
app.use('/api/cells', cellRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production: 클라이언트 정적 파일 서빙
if (process.env.NODE_ENV === 'production') {
  // __dirname은 server/dist (컴파일된 위치)
  // 클라이언트는 ../client/dist에 위치
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  console.log('[Production] Serving static files from:', clientDistPath);

  // 정적 파일 서빙
  app.use(express.static(clientDistPath));

  // SPA fallback: API가 아닌 모든 요청을 index.html로
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

export default app;
