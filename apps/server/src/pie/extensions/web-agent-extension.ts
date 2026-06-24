import type { ExtensionAPI } from '@pie-lab/coding-agent';
import { fetchPageText } from '../url/fetch-page.js';
import { assertSafeUrl, extractUrls } from '../url/security.js';

const DANGEROUS_BASH = [
  /\brm\s+(-rf?|--recursive)/i,
  /\bsudo\b/i,
  /\b(chmod|chown)\b.*777/i,
  /\bcurl\b/i,
  /\bwget\b/i,
];

export function registerWebAgentExtension(pi: ExtensionAPI) {
  pi.on('before_agent_start', async (event) => {
    const urls = extractUrls(event.prompt);
    const extra: string[] = [
      'When the user provides an external URL, call fetch_url first.',
      'Summarize only from fetched page text. If fetch fails, say you do not know.',
    ];

    if (urls.length > 0) {
      extra.push(`Detected URL(s): ${urls.join(', ')}`);
      try {
        const page = await fetchPageText(urls[0]);
        extra.push(
          '',
          'Prefetched page context (use as primary source):',
          `URL: ${page.url}`,
          page.title ? `Title: ${page.title}` : '',
          page.text,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'prefetch failed';
        extra.push('', `Prefetch failed: ${message}. Call fetch_url yourself.`);
      }
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\n${extra.filter(Boolean).join('\n')}`,
    };
  });

  pi.on('tool_call', async (event) => {
    if (event.toolName === 'bash') {
      const command = String(event.input?.command ?? '');
      if (DANGEROUS_BASH.some((pattern) => pattern.test(command))) {
        return { block: true, reason: 'Blocked bash command in web-agent mode' };
      }
    }

    if (event.toolName === 'fetch_url') {
      const url = String(event.input?.url ?? '');
      try {
        await assertSafeUrl(url);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unsafe url';
        return { block: true, reason: message };
      }
    }

    return undefined;
  });
}
