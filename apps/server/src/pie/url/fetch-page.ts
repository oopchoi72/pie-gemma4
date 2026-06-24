import { assertSafeUrl } from './security.js';

const MAX_BYTES = 500 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_TEXT_CHARS = 12_000;

function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const text = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

export interface FetchPageResult {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

export async function fetchPageText(rawUrl: string): Promise<FetchPageResult> {
  const url = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'pie-gemma4-fetch-url/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url.toString()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Empty response body');
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        throw new Error(`Response too large (>${MAX_BYTES} bytes)`);
      }
      chunks.push(value);
    }

    const html = Buffer.concat(chunks).toString('utf8');
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
    const text = htmlToText(html);

    return {
      url: url.toString(),
      title,
      text,
      truncated: text.length >= MAX_TEXT_CHARS,
    };
  } finally {
    clearTimeout(timer);
  }
}
