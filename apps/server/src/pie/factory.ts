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

  const resourceLoader = new DefaultResourceLoader({
    cwd: config.pieCwd,
    agentDir: getAgentDir(),
    systemPromptOverride: () =>
      mode === 'chat'
        ? 'You are a helpful assistant. Answer clearly and concisely in the user language.'
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
