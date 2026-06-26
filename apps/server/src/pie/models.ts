import { AuthStorage, ModelRegistry } from '@pie-lab/coding-agent';
import { config } from '../config.js';

export interface ModelInfo {
  provider: string;
  id: string;
  name: string;
  input: ('text' | 'image')[];
}

export interface ResolvedModel {
  model: NonNullable<ReturnType<ModelRegistry['find']>>;
  registry: ModelRegistry;
  modelId: string;
}

let cachedRegistry: ModelRegistry | null = null;

function getModelRegistry(): ModelRegistry {
  if (!cachedRegistry) {
    const authStorage = AuthStorage.create();
    authStorage.setRuntimeApiKey('ollama', config.ollamaApiKey);
    cachedRegistry = ModelRegistry.create(authStorage, config.modelsJsonPath);
  }
  return cachedRegistry;
}

export function listModels(): ModelInfo[] {
  const registry = getModelRegistry();
  const loadError = registry.getError();
  if (loadError) {
    throw new Error(`Failed to load models.json: ${loadError}`);
  }

  return registry
    .getAll()
    .filter((model) => model.provider === config.provider)
    .map((model) => ({
      provider: model.provider,
      id: model.id,
      name: model.name,
      input: [...model.input],
    }));
}

export function resolveModel(modelName?: string): ResolvedModel {
  const registry = getModelRegistry();
  const id = modelName ?? config.modelName;
  const model = registry.find(config.provider, id);

  if (!model) {
    throw new Error(
      `Model not found: ${config.provider}/${id}. Check .pie/models.json`,
    );
  }

  if (config.ollamaBaseUrl) {
    model.baseUrl = config.ollamaBaseUrl;
  }

  return { model, registry, modelId: id };
}
