import { Router, Request, Response } from 'express';
import { oneDriveService } from '../services/onedrive.js';

const router = Router();

/**
 * OneDrive 인증 시작
 * GET /api/onedrive/auth
 */
router.get('/auth', (req: Request, res: Response): void => {
  if (!oneDriveService.isConfigured()) {
    res.status(500).send(`
      <html>
        <head><title>OneDrive 설정 오류</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>❌ OneDrive 설정이 필요합니다</h1>
          <p>환경 변수에 다음 값이 설정되어 있는지 확인하세요:</p>
          <ul>
            <li><code>ONEDRIVE_CLIENT_ID</code></li>
            <li><code>ONEDRIVE_CLIENT_SECRET</code></li>
          </ul>
          <p>자세한 내용은 <code>docs/ONEDRIVE_SETUP.md</code>를 참조하세요.</p>
        </body>
      </html>
    `);
    return;
  }

  const authUrl = oneDriveService.getAuthUrl();
  res.redirect(authUrl);
});

/**
 * OneDrive OAuth 콜백
 * GET /api/onedrive/callback
 */
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, error, error_description } = req.query;

  if (error) {
    res.status(400).send(`
      <html>
        <head><title>인증 오류</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>❌ 인증 오류</h1>
          <p><strong>오류:</strong> ${error}</p>
          <p><strong>설명:</strong> ${error_description || '없음'}</p>
          <p><a href="/api/onedrive/auth">다시 시도</a></p>
        </body>
      </html>
    `);
    return;
  }

  if (!code) {
    res.status(400).send(`
      <html>
        <head><title>인증 오류</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>❌ 인증 코드가 없습니다</h1>
          <p><a href="/api/onedrive/auth">다시 시도</a></p>
        </body>
      </html>
    `);
    return;
  }

  try {
    await oneDriveService.exchangeCodeForToken(code as string);

    res.send(`
      <html>
        <head><title>인증 성공</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>✅ OneDrive 연동 완료!</h1>
          <p>이제 파일이 OneDrive에 저장됩니다.</p>
          <p style="color: #666; margin-top: 20px;">이 창을 닫아도 됩니다.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OneDrive token exchange error:', error.response?.data || error.message);
    res.status(500).send(`
      <html>
        <head><title>인증 오류</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>❌ 토큰 교환 실패</h1>
          <p>${error.response?.data?.error_description || error.message}</p>
          <p><a href="/api/onedrive/auth">다시 시도</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * OneDrive 연결 상태 확인
 * GET /api/onedrive/status
 */
router.get('/status', (req: Request, res: Response): void => {
  res.json({
    configured: oneDriveService.isConfigured(),
    authenticated: oneDriveService.isAuthenticated(),
  });
});

export default router;
