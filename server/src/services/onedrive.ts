import axios from 'axios';
import fs from 'fs';
import path from 'path';

// OneDrive 토큰 저장 파일 경로
const TOKEN_FILE = path.join(process.cwd(), '.onedrive-token.json');

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface OneDriveUploadResult {
  id: string;
  name: string;
  webUrl: string;
  downloadUrl: string;
  size: number;
}

class OneDriveService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private folderPath: string;
  private tokenData: TokenData | null = null;

  constructor() {
    this.clientId = process.env.ONEDRIVE_CLIENT_ID || '';
    this.clientSecret = process.env.ONEDRIVE_CLIENT_SECRET || '';
    this.redirectUri = process.env.ONEDRIVE_REDIRECT_URI || 'http://localhost:3001/api/onedrive/callback';
    this.folderPath = process.env.ONEDRIVE_FOLDER_PATH || '/워크플로우/첨부파일';

    this.loadToken();
  }

  /**
   * OneDrive가 설정되어 있는지 확인
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * 유효한 토큰이 있는지 확인
   */
  isAuthenticated(): boolean {
    return !!(this.tokenData && this.tokenData.refreshToken);
  }

  /**
   * 저장된 토큰 로드
   */
  private loadToken(): void {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
        this.tokenData = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load OneDrive token:', error);
      this.tokenData = null;
    }
  }

  /**
   * 토큰 저장
   */
  private saveToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
  }

  /**
   * OAuth 인증 URL 생성
   */
  getAuthUrl(): string {
    const scope = encodeURIComponent('Files.ReadWrite offline_access User.Read');
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scope}&response_mode=query`;
  }

  /**
   * 인증 코드로 토큰 교환
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    this.saveToken({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
    });
  }

  /**
   * 액세스 토큰 갱신
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokenData?.refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.tokenData.refreshToken,
        grant_type: 'refresh_token',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    this.saveToken({
      accessToken: access_token,
      refreshToken: refresh_token || this.tokenData.refreshToken,
      expiresAt: Date.now() + expires_in * 1000,
    });

    return access_token;
  }

  /**
   * 유효한 액세스 토큰 가져오기
   */
  private async getAccessToken(): Promise<string> {
    if (!this.tokenData) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    // 토큰이 5분 이내에 만료되면 갱신
    if (Date.now() > this.tokenData.expiresAt - 5 * 60 * 1000) {
      return this.refreshAccessToken();
    }

    return this.tokenData.accessToken;
  }

  /**
   * 폴더 생성 (없으면)
   */
  private async ensureFolder(folderPath: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const folders = folderPath.split('/').filter(f => f);
    let currentPath = '';

    for (const folder of folders) {
      currentPath += '/' + folder;
      try {
        await axios.get(
          `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(currentPath)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (error: any) {
        if (error.response?.status === 404) {
          // 폴더가 없으면 생성
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
          await axios.post(
            parentPath === '/'
              ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
              : `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(parentPath)}:/children`,
            {
              name: folder,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'fail',
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }
    }
  }

  /**
   * 파일 업로드
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    subFolder: string = 'meetings'
  ): Promise<OneDriveUploadResult> {
    const accessToken = await this.getAccessToken();
    const fullPath = `${this.folderPath}/${subFolder}`;

    // 폴더 생성
    await this.ensureFolder(fullPath);

    const filePath = `${fullPath}/${fileName}`;

    // 4MB 이하는 단순 업로드, 이상은 세션 업로드
    if (buffer.length <= 4 * 1024 * 1024) {
      const response = await axios.put(
        `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(filePath)}:/content`,
        buffer,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
          },
        }
      );

      return {
        id: response.data.id,
        name: response.data.name,
        webUrl: response.data.webUrl,
        downloadUrl: response.data['@microsoft.graph.downloadUrl'] || '',
        size: response.data.size,
      };
    } else {
      // 대용량 파일 세션 업로드
      return this.uploadLargeFile(buffer, filePath, accessToken);
    }
  }

  /**
   * 대용량 파일 업로드 (세션 방식)
   */
  private async uploadLargeFile(
    buffer: Buffer,
    filePath: string,
    accessToken: string
  ): Promise<OneDriveUploadResult> {
    // 업로드 세션 생성
    const sessionResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(filePath)}:/createUploadSession`,
      {
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const uploadUrl = sessionResponse.data.uploadUrl;
    const chunkSize = 320 * 1024 * 10; // 3.2MB chunks
    let start = 0;
    let response;

    while (start < buffer.length) {
      const end = Math.min(start + chunkSize, buffer.length);
      const chunk = buffer.slice(start, end);

      response = await axios.put(uploadUrl, chunk, {
        headers: {
          'Content-Length': chunk.length.toString(),
          'Content-Range': `bytes ${start}-${end - 1}/${buffer.length}`,
        },
      });

      start = end;
    }

    return {
      id: response!.data.id,
      name: response!.data.name,
      webUrl: response!.data.webUrl,
      downloadUrl: response!.data['@microsoft.graph.downloadUrl'] || '',
      size: response!.data.size,
    };
  }

  /**
   * 파일 삭제
   */
  async deleteFile(fileId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    await axios.delete(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  }

  /**
   * 공유 링크 생성
   */
  async createShareLink(fileId: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    const response = await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/createLink`,
      {
        type: 'view',
        scope: 'anonymous',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.link.webUrl;
  }

  /**
   * 다운로드 URL 가져오기
   */
  async getDownloadUrl(fileId: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data['@microsoft.graph.downloadUrl'];
  }
}

// 싱글톤 인스턴스
export const oneDriveService = new OneDriveService();
export default oneDriveService;
