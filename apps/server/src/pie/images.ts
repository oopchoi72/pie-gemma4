import { resizeImage } from '@pie-lab/coding-agent';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_IMAGES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

export interface IncomingImage {
  data: string;
  mimeType: string;
}

export interface NormalizedImage {
  type: 'image';
  data: string;
  mimeType: string;
}

export function normalizeIncomingImages(raw: unknown): IncomingImage[] {
  if (!Array.isArray(raw)) return [];

  const images: IncomingImage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const data = (entry as { data?: unknown }).data;
    const mimeType = (entry as { mimeType?: unknown }).mimeType;
    if (typeof data !== 'string' || typeof mimeType !== 'string') continue;
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }
    const bytes = Buffer.from(data, 'base64');
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error(`Image too large (max ${MAX_BYTES / 1024 / 1024}MB)`);
    }
    images.push({ data, mimeType });
    if (images.length >= MAX_IMAGES) break;
  }

  return images;
}

export async function toPromptImages(
  images: IncomingImage[],
): Promise<NormalizedImage[]> {
  const result: NormalizedImage[] = [];

  for (const image of images) {
    const bytes = Buffer.from(image.data, 'base64');
    const resized = await resizeImage(bytes, image.mimeType, {
      maxWidth: 2048,
      maxHeight: 2048,
      maxBytes: 3 * 1024 * 1024,
    });

    if (resized) {
      result.push({
        type: 'image',
        data: resized.data,
        mimeType: resized.mimeType,
      });
      continue;
    }

    result.push({
      type: 'image',
      data: image.data,
      mimeType: image.mimeType,
    });
  }

  return result;
}
