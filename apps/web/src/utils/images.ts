export interface PendingImage {
  id: string;
  mimeType: string;
  data: string;
  previewUrl: string;
}

const MAX_IMAGES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function resolveMimeType(file: File, fallbackMime?: string): string | null {
  const mime = file.type || fallbackMime || '';
  if (mime.startsWith('image/')) return mime;
  // Clipboard paste often yields File with empty type; trust item type or default.
  if (!file.type && fallbackMime?.startsWith('image/')) return fallbackMime;
  if (!file.type && !fallbackMime) return 'image/png';
  return null;
}

function normalizeClipboardFile(file: File, fallbackMime?: string): File | null {
  const mimeType = resolveMimeType(file, fallbackMime);
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) return null;
  if (file.type === mimeType) return file;
  return new File([file], file.name || 'pasted-image.png', { type: mimeType });
}

export async function fileToPendingImage(file: File): Promise<PendingImage> {
  const mimeType = resolveMimeType(file);
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
    throw new Error('지원 이미지: JPEG, PNG, WebP, GIF');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('이미지가 너무 큽니다 (최대 8MB).');
  }

  const data = await readFileAsBase64(file);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mimeType,
    data,
    previewUrl: `data:${mimeType};base64,${data}`,
  };
}

export function readClipboardImages(
  clipboardData: DataTransfer | null,
): File[] {
  if (!clipboardData) return [];

  const files: File[] = [];
  const seen = new Set<File>();

  for (const item of clipboardData.items) {
    if (item.kind !== 'file') continue;
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file || seen.has(file)) continue;
    const normalized = normalizeClipboardFile(file, item.type);
    if (normalized) {
      seen.add(file);
      files.push(normalized);
    }
  }

  if (files.length === 0) {
    for (const file of clipboardData.files) {
      if (seen.has(file)) continue;
      const normalized = normalizeClipboardFile(file);
      if (normalized) {
        seen.add(file);
        files.push(normalized);
      }
    }
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
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}
