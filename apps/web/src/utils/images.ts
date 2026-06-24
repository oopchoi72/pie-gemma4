export interface PendingImage {
  id: string;
  mimeType: string;
  data: string;
  previewUrl: string;
}

const MAX_IMAGES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

export async function fileToPendingImage(file: File): Promise<PendingImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 첨부할 수 있습니다.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('이미지가 너무 큽니다 (최대 8MB).');
  }

  const data = await readFileAsBase64(file);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mimeType: file.type,
    data,
    previewUrl: `data:${file.type};base64,${data}`,
  };
}

export function readClipboardImages(
  clipboardData: DataTransfer | null,
): File[] {
  if (!clipboardData) return [];
  const files: File[] = [];
  for (const item of clipboardData.items) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

export function limitAttachments(
  current: PendingImage[],
  incoming: PendingImage[],
): PendingImage[] {
  const merged = [...current, ...incoming];
  return merged.slice(0, MAX_IMAGES);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}
