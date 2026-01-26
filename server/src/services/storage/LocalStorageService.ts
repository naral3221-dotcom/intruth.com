/**
 * Local Storage Service
 * 로컬 파일시스템을 사용한 파일 저장소 구현
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IStorageService, UploadResult } from './IStorageService.js';

export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(baseDir?: string, baseUrl?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), 'uploads');
    this.baseUrl = baseUrl || '/uploads';

    // 기본 디렉토리 생성
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getStorageType(): 'local' | 'onedrive' {
    return 'local';
  }

  /**
   * 폴더 경로 확보 (없으면 생성)
   */
  private ensureFolder(folder: string): string {
    const folderPath = path.join(this.baseDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return folderPath;
  }

  /**
   * 고유한 저장 파일명 생성
   */
  private generateStoredName(originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    return `${uuidv4()}-${baseName}${ext}`;
  }

  async uploadFile(buffer: Buffer, originalName: string, folder: string): Promise<UploadResult> {
    const folderPath = this.ensureFolder(folder);
    const storedName = this.generateStoredName(originalName);
    const filePath = path.join(folderPath, storedName);

    // 파일 저장
    fs.writeFileSync(filePath, buffer);

    // MIME 타입 추정 (확장자 기반)
    const mimeType = this.getMimeType(originalName);

    return {
      id: storedName, // 로컬에서는 저장된 파일명이 ID
      fileName: originalName,
      storedName,
      filePath: `${this.baseUrl}/${folder}/${storedName}`,
      fileSize: buffer.length,
      mimeType,
      storageType: 'local',
    };
  }

  async deleteFile(fileId: string, folder: string): Promise<void> {
    const filePath = path.join(this.baseDir, folder, fileId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async fileExists(fileId: string, folder: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, folder, fileId);
    return fs.existsSync(filePath);
  }

  async getFileUrl(fileId: string, folder: string): Promise<string> {
    return `${this.baseUrl}/${folder}/${fileId}`;
  }

  /**
   * 확장자 기반 MIME 타입 추정
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
