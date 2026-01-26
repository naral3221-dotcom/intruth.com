/**
 * AttachmentStep - 첨부파일 관리 스텝
 */
import { Upload, Paperclip, Trash2, FileText, Image, File } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/core/utils/cn';
import type { MeetingAttachment } from '@/types';

interface AttachmentStepProps {
  pendingFiles: File[];
  existingAttachments?: MeetingAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemovePendingFile: (index: number) => void;
  onDeleteExistingAttachment?: (attachmentId: number) => void;
}

export function AttachmentStep({
  pendingFiles,
  existingAttachments = [],
  onAddFiles,
  onRemovePendingFile,
  onDeleteExistingAttachment,
}: AttachmentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddFiles(files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onAddFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  const totalFiles = pendingFiles.length + existingAttachments.length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">첨부파일</h3>
          {totalFiles > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {totalFiles}개 파일
            </p>
          )}
        </div>
      </div>

      {/* 파일 업로드 영역 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          'flex flex-col items-center justify-center w-full h-32',
          'border-2 border-dashed border-border rounded-lg',
          'cursor-pointer hover:border-primary/50 transition-colors',
          'bg-muted/20'
        )}
      >
        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          클릭하거나 파일을 드래그하세요
        </p>
        <p className="text-xs text-muted-foreground mt-1">최대 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 대기 중인 파일 */}
      {pendingFiles.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            업로드 대기 중 ({pendingFiles.length}개)
          </p>
          <div className="space-y-2">
            {pendingFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded">
                      <FileIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePendingFile(index)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 기존 첨부파일 (수정 모드) */}
      {existingAttachments.length > 0 && onDeleteExistingAttachment && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            기존 첨부파일 ({existingAttachments.length}개)
          </p>
          <div className="space-y-2">
            {existingAttachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.mimeType);
              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-muted rounded">
                      <FileIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteExistingAttachment(attachment.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {totalFiles === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          첨부된 파일이 없습니다.
        </p>
      )}
    </div>
  );
}
