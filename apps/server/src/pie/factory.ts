import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRegistry,
  SessionManager,
  type AgentSession,
} from '@pie-lab/coding-agent';
import { config, getToolsForMode, type PieMode } from '../config.js';

export async function createChatSession(mode: PieMode): Promise<AgentSession> {
  const authStorage = AuthStorage.create();
  authStorage.setRuntimeApiKey('ollama', config.ollamaApiKey);

  const modelRegistry = ModelRegistry.create(authStorage, config.modelsJsonPath);
  const model = modelRegistry.find(config.provider, config.modelName);

  if (!model) {
    throw new Error(
      `Model not found: ${config.provider}/${config.modelName}. Check .pie/models.json`,
    );
  }

  if (config.ollamaBaseUrl) {
    model.baseUrl = config.ollamaBaseUrl;
  }

  const resourceLoader = new DefaultResourceLoader({
    cwd: config.pieCwd,
    agentDir: getAgentDir(),
    systemPromptOverride: () =>
      mode === 'chat'
        ? [
            'You are a helpful assistant for a web chat UI.',
            'Reply in the same language as the user (Korean when the user writes Korean).',
            'Follow length constraints exactly (e.g. one short sentence means one short sentence).',
            'Finish every answer completely; never stop mid-sentence or mid-table.',
            'This chat mode cannot run tools. When asked about capabilities, describe only:',
            '| Tool | Description |',
            '| read | Read file contents |',
            '| grep | Search text in files |',
            '| find | Find files by glob pattern |',
            '| ls | List directory entries |',
          ].join('\n')
        : 'You are a coding assistant with access to project files and shell tools.',
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd: config.pieCwd,
    model,
    tools: getToolsForMode(mode),
    sessionManager: SessionManager.inMemory(config.pieCwd),
    authStorage,
    modelRegistry,
    resourceLoader,
  });

  return session;
}
