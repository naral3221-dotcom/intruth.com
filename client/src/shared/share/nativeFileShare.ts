import type { ShareResult } from './kakaoShare';

interface NativeFileShareInput {
  file: File;
  title: string;
  text?: string;
}

export function canNativeFileShare() {
  if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
    return false;
  }

  const testFile = new File([''], 'intruth-meeting.pdf', { type: 'application/pdf' });
  return navigator.canShare({ files: [testFile] });
}

export async function shareFileOrDownload({ file, title, text }: NativeFileShareInput): Promise<ShareResult> {
  const shareData: ShareData = {
    title,
    text,
    files: [file],
  };

  if (navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'native';
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return 'downloaded';
}
