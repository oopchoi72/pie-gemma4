import type { AgentSessionEvent } from '@pie-lab/coding-agent';
import type { FastifyInstance } from 'fastify';
import {
  augmentUserMessage,
  CONTINUE_PROMPT,
  needsContinuation,
} from '../pie/response-quality.js';
import {
  getLastAssistantText,
  SessionNotFoundError,
  type SessionPool,
} from '../pie/session-pool.js';

type SsePayload =
  | { type: 'delta'; text: string }
  | { type: 'reset' }
  | { type: 'tool_start'; toolName: string; args?: string }
  | {
      type: 'tool_update';
      toolName: string;
      preview: string;
    }
  | {
      type: 'tool_end';
      toolName: string;
      isError: boolean;
      preview?: string;
    }
  | { type: 'error'; message: string }
  | { type: 'done' };

function summarizeToolResult(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const content = (result as { content?: Array<{ type?: string; text?: string }> })
    .content;
  if (!Array.isArray(content)) return undefined;
  const text = content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
  if (!text) return undefined;
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

function summarizeToolArgs(args: unknown): string | undefined {
  if (!args || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  if (typeof record.url === 'string') return record.url;
  if (typeof record.command === 'string') {
    return record.command.length > 120
      ? `${record.command.slice(0, 120)}…`
      : record.command;
  }
  const json = JSON.stringify(record);
  return json.length > 120 ? `${json.slice(0, 120)}…` : json;
}

function writeSse(
  write: (chunk: string) => void,
  payload: SsePayload,
) {
  write(`data: ${JSON.stringify(payload)}\n\n`);
}

function mapEventToSse(event: AgentSessionEvent): SsePayload | null {
  if (event.type === 'message_update') {
    const delta = event.assistantMessageEvent;
    if (delta.type === 'text_delta') {
      return { type: 'delta', text: delta.delta };
    }
    if (delta.type === 'error') {
      return {
        type: 'error',
        message: delta.reason === 'aborted' ? 'Response aborted' : 'LLM stream error',
      };
    }
    return null;
  }

  if (event.type === 'auto_retry_end' && !event.success) {
    return {
      type: 'error',
      message: event.finalError ?? 'LLM request failed after retries',
    };
  }

  if (event.type === 'tool_execution_start') {
    return {
      type: 'tool_start',
      toolName: event.toolName,
      args: summarizeToolArgs(event.args),
    };
  }

  if (event.type === 'tool_execution_update') {
    const preview = summarizeToolResult(event.partialResult);
    if (!preview) return null;
    return {
      type: 'tool_update',
      toolName: event.toolName,
      preview,
    };
  }

  if (event.type === 'tool_execution_end') {
    return {
      type: 'tool_end',
      toolName: event.toolName,
      isError: event.isError,
      preview: summarizeToolResult(event.result),
    };
  }

  return null;
}

export async function registerChatRoutes(
  app: FastifyInstance,
  pool: SessionPool,
) {
  app.post<{ Params: { id: string }; Body: { message?: string } }>(
    '/api/sessions/:id/chat',
    async (request, reply) => {
      const message = request.body?.message?.trim();
      if (!message) {
        return reply.code(400).send({ error: 'message is required' });
      }

      let entry;
      try {
        entry = pool.require(request.params.id);
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        throw error;
      }

      if (entry.isStreaming) {
        return reply.code(409).send({ error: 'Session is already streaming' });
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      const write = (chunk: string) => {
        reply.raw.write(chunk);
      };

      pool.setStreaming(entry.meta.id, true);

      let streamedText = false;

      const unsubscribe = entry.session.subscribe((event) => {
        const payload = mapEventToSse(event);
        if (payload?.type === 'delta' && payload.text) {
          streamedText = true;
        }
        if (payload) writeSse(write, payload);
      });

      try {
        let followUp = augmentUserMessage(message);
        const maxContinues = 2;

        for (let attempt = 0; attempt <= maxContinues; attempt++) {
          await entry.session.prompt(followUp);

          const assistantText = getLastAssistantText(entry.session);
          if (!needsContinuation(message, assistantText)) break;
          if (attempt === maxContinues) break;

          writeSse(write, { type: 'reset' });
          followUp = CONTINUE_PROMPT;
        }

        if (!streamedText) {
          const lastAssistant = [...entry.session.messages]
            .reverse()
            .find((msg) => msg.role === 'assistant');

          const errorText =
            lastAssistant &&
            'stopReason' in lastAssistant &&
            lastAssistant.stopReason === 'error'
              ? entry.session.agent.state.errorMessage ?? 'LLM returned an error'
              : 'No response from model. Check Ollama model is pulled.';

          writeSse(write, { type: 'error', message: errorText });
        }

        writeSse(write, { type: 'done' });
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : 'Unknown error';
        writeSse(write, { type: 'error', message: errMessage });
        writeSse(write, { type: 'done' });
      } finally {
        unsubscribe();
        pool.setStreaming(entry.meta.id, false);
        reply.raw.end();
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/sessions/:id/abort',
    async (request, reply) => {
      try {
        const entry = pool.require(request.params.id);
        await entry.session.abort();
        return { ok: true };
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
