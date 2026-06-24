import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

for (const envPath of [
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.env.local'),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
}

export type PieMode = 'chat' | 'agent';

function parseMode(value: string | undefined): PieMode {
  return value === 'agent' ? 'agent' : 'chat';
}

export const config = {
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 3001),
  pieMode: parseMode(process.env.PIE_MODE),
  pieCwd: path.resolve(projectRoot, process.env.PIE_CWD ?? '.'),
  projectRoot,
  modelsJsonPath:
    process.env.MODELS_JSON_PATH ??
    path.join(projectRoot, '.pie', 'models.json'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  provider: 'ollama' as const,
  modelName:
    process.env.MODEL_NAME ??
    'xentriom/gemma-4-12B-coder-fable5-composer2.5-v1',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  ollamaApiKey: process.env.OLLAMA_API_KEY ?? 'ollama',
};

export function getToolsForMode(mode: PieMode): string[] {
  return mode === 'chat'
    ? ['read', 'grep', 'find', 'ls']
    : ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls'];
}
