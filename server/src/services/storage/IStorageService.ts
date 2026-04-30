/**
 * Storage Service Interface
 * 파일 저장소 추상화 인터페이스
 * - LocalStorageService: 로컬 파일시스템
 * - OneDriveStorageService: OneDrive (추후 구현)
 */

export interface UploadResult {
  id: string;           // 저장소 내 파일 ID (OneDrive: driveItemId, Local: 파일명)
  fileName: string;     // 원본 파일명
  storedName: string;   // 저장된 파일명
  filePath: string;     // 접근 경로 (URL 또는 로컬 경로)
  fileSize: number;
  mimeType: string;
  storageType: 'local' | 'onedrive';
}

export interface FileInfo {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  storageType: 'local' | 'onedrive';
}

export interface IStorageService {
  /**
   * 저장소 타입 반환
   */
  getStorageType(): 'local' | 'onedrive';

  /**
   * 파일 업로드
   * @param buffer - 파일 버퍼
   * @param originalName - 원본 파일명
   * @param folder - 저장 폴더 (예: 'meetings')
   */
  uploadFile(buffer: Buffer, originalName: string, folder: string): Promise<UploadResult>;

  /**
   * 파일 삭제
   * @param fileId - 파일 ID (OneDrive ID 또는 로컬 파일명)
   * @param folder - 저장 폴더
   */
  deleteFile(fileId: string, folder: string): Promise<void>;

  /**
   * 파일 존재 확인
   */
  fileExists(fileId: string, folder: string): Promise<boolean>;

  /**
   * 파일 다운로드 URL 또는 경로 반환
   */
  getFileUrl(fileId: string, folder: string): Promise<string>;

  /**
   * 파일 버퍼 읽기
   * AI 전사/분석처럼 서버 내부에서 파일 원본이 필요한 작업에 사용
   */
  readFile(fileId: string, folder: string): Promise<Buffer>;
}
