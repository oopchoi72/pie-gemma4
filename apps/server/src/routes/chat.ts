import type { AgentSessionEvent } from '@pie-lab/coding-agent';
import type { FastifyInstance } from 'fastify';
import {
  SessionNotFoundError,
  type SessionPool,
} from '../pie/session-pool.js';

type SsePayload =
  | { type: 'delta'; text: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_end'; toolName: string; isError: boolean }
  | { type: 'error'; message: string }
  | { type: 'done' };

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
    return null;
  }

  if (event.type === 'tool_execution_start') {
    return { type: 'tool_start', toolName: event.toolName };
  }

  if (event.type === 'tool_execution_end') {
    return {
      type: 'tool_end',
      toolName: event.toolName,
      isError: event.isError,
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

      const unsubscribe = entry.session.subscribe((event) => {
        const payload = mapEventToSse(event);
        if (payload) writeSse(write, payload);
        if (event.type === 'agent_end') {
          writeSse(write, { type: 'done' });
        }
      });

      try {
        await entry.session.prompt(message);
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
