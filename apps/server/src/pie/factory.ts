import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  type AgentSession,
} from '@pie-lab/coding-agent';
import { resolveModel } from './models.js';
import {
  config,
  getToolsForMode,
  usesFetchUrlTool,
  type PieMode,
} from '../config.js';
import { registerWebAgentExtension } from './extensions/web-agent-extension.js';
import { fetchUrlTool } from './tools/fetch-url.js';

function systemPromptForMode(mode: PieMode): string {
  if (mode === 'chat') {
    return [
      'You are a helpful assistant for a web chat UI.',
      'Reply in the same language as the user (Korean when the user writes Korean).',
      'Follow length constraints exactly (e.g. one short sentence means one short sentence).',
      'Finish every answer completely; never stop mid-sentence or mid-table.',
      'Never reply with only an introductory sentence — always include the full body in the same message.',
      'For document-style requests, use markdown headings (##) and bullet lists.',
      'This chat mode cannot run tools. When asked about capabilities, describe only:',
      '| Tool | Description |',
      '| read | Read file contents |',
      '| grep | Search text in files |',
      '| find | Find files by glob pattern |',
      '| ls | List directory entries |',
    ].join('\n');
  }

  if (mode === 'web-agent') {
    return [
      'You are a helpful web agent assistant powered by pie.',
      'Reply in the same language as the user (Korean when the user writes Korean).',
      'For external URLs, you MUST call fetch_url before summarizing or analyzing.',
      'When the user attaches images, analyze the image pixels directly before using any accompanying text.',
      'For Korean text in images, transcribe names and dates exactly as shown — never substitute similar characters.',
      'Never claim an image is missing when the user attached one. If text is unreadable, say so plainly.',
      'Never invent page or image content. If fetch_url fails or images are unclear, say so.',
      'Finish every answer completely; never stop mid-sentence.',
      'Available tools: read, grep, find, ls, fetch_url.',
    ].join('\n');
  }

  return 'You are a coding assistant with access to project files and shell tools.';
}

export async function createChatSession(
  mode: PieMode,
  modelName?: string,
): Promise<AgentSession> {
  const authStorage = AuthStorage.create();
  authStorage.setRuntimeApiKey('ollama', config.ollamaApiKey);

  const { model, registry: modelRegistry } = resolveModel(modelName);

  const resourceLoader = new DefaultResourceLoader({
    cwd: config.pieCwd,
    agentDir: getAgentDir(),
    extensionFactories:
      mode === 'web-agent' ? [registerWebAgentExtension] : undefined,
    systemPromptOverride: () => systemPromptForMode(mode),
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd: config.pieCwd,
    model,
    tools: getToolsForMode(mode),
    customTools: usesFetchUrlTool(mode) ? [fetchUrlTool] : [],
    sessionManager: SessionManager.inMemory(config.pieCwd),
    authStorage,
    modelRegistry,
    resourceLoader,
  });

  return session;
}
