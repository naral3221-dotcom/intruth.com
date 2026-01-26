import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 디버깅: 현재 환경 정보 출력
console.log('[Debug] __dirname:', __dirname);
console.log('[Debug] process.cwd():', process.cwd());
console.log('[Debug] NODE_ENV:', process.env.NODE_ENV);

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
  // 가능한 클라이언트 경로들 시도
  const possiblePaths = [
    path.resolve(__dirname, '../../client/dist'),  // server/dist에서 상대경로
    path.resolve(process.cwd(), 'client/dist'),    // 루트에서 상대경로
    path.resolve(process.cwd(), '../client/dist'), // server에서 상대경로
    '/app/client/dist',                            // Railway 절대경로
  ];

  let clientDistPath = '';

  for (const p of possiblePaths) {
    console.log(`[Production] Checking path: ${p}`);
    if (fs.existsSync(p)) {
      const files = fs.readdirSync(p);
      console.log(`[Production] Found at ${p}, files:`, files.slice(0, 5));
      if (files.includes('index.html')) {
        clientDistPath = p;
        break;
      }
    } else {
      console.log(`[Production] Path does not exist: ${p}`);
    }
  }

  if (!clientDistPath) {
    console.error('[Production] ERROR: Could not find client dist folder!');
    console.log('[Production] Listing root directories...');
    try {
      const rootFiles = fs.readdirSync(process.cwd());
      console.log('[Production] Files in cwd:', rootFiles);

      // app 디렉토리 확인
      if (fs.existsSync('/app')) {
        const appFiles = fs.readdirSync('/app');
        console.log('[Production] Files in /app:', appFiles);
      }
    } catch (e) {
      console.error('[Production] Error listing directories:', e);
    }
  } else {
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
}

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

export default app;
