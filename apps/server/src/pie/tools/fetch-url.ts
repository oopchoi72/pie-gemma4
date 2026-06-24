import { defineTool } from '@pie-lab/coding-agent';
import { fetchPageText } from '../url/fetch-page.js';

export const fetchUrlTool = defineTool({
  name: 'fetch_url',
  label: 'Fetch URL',
  description:
    'Fetch a public http(s) URL and return extracted page text for analysis or summarization.',
  promptSnippet: 'Fetch and read a web page by URL.',
  promptGuidelines: [
    'Always call fetch_url before summarizing or analyzing an external link.',
    'If fetch_url fails, tell the user you could not access the page.',
    'Base summaries only on fetch_url output, never on guesswork.',
  ],
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Public http or https URL to fetch',
      },
    },
    required: ['url'],
  },
  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    const url = typeof params.url === 'string' ? params.url.trim() : '';
    if (!url) {
      return {
        content: [{ type: 'text' as const, text: 'Error: url is required' }],
        details: { error: true },
      };
    }

    try {
      const page = await fetchPageText(url);
      const header = [
        `URL: ${page.url}`,
        page.title ? `Title: ${page.title}` : null,
        page.truncated ? 'Note: content truncated for context limits.' : null,
        '',
        'Content:',
      ]
        .filter(Boolean)
        .join('\n');

      return {
        content: [{ type: 'text' as const, text: `${header}\n${page.text}` }],
        details: { error: false, ...page },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fetch failed';
      return {
        content: [{ type: 'text' as const, text: `Error fetching URL: ${message}` }],
        details: { error: true, message },
      };
    }
  },
});
