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
  modelsJsonPath: path.join(projectRoot, '.pie', 'models.json'),
  provider: 'ollama' as const,
  modelName:
    process.env.MODEL_NAME ??
    'hf.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  ollamaApiKey: process.env.OLLAMA_API_KEY ?? 'ollama',
};

export function getToolsForMode(mode: PieMode): string[] {
  return mode === 'chat'
    ? ['read', 'grep', 'find', 'ls']
    : ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls'];
}
