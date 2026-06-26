import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { listModels } from '../pie/models.js';
import {
  SessionBusyError,
  SessionNotFoundError,
  type SessionPool,
} from '../pie/session-pool.js';

export async function registerSessionRoutes(
  app: FastifyInstance,
  pool: SessionPool,
) {
  app.get('/api/health', async () => ({
    ok: true,
    mode: config.pieMode,
    defaultModel: config.modelName,
    model: `${config.provider}/${config.modelName}`,
  }));

  app.get('/api/models', async () => ({
    defaultModel: config.modelName,
    models: listModels(),
  }));

  app.get('/api/sessions', async () => ({
    sessions: pool.list(),
  }));

  app.post<{ Body: { name?: string; model?: string } }>(
    '/api/sessions',
    async (request) => {
      const meta = await pool.create(request.body?.name, undefined, request.body?.model);
      return meta;
    },
  );

  app.patch<{ Params: { id: string }; Body: { model?: string } }>(
    '/api/sessions/:id/model',
    async (request, reply) => {
      const model = request.body?.model?.trim();
      if (!model) {
        return reply.code(400).send({ error: 'model is required' });
      }

      try {
        return await pool.setModel(request.params.id, model);
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        if (error instanceof SessionBusyError) {
          return reply.code(409).send({ error: error.message });
        }
        if (error instanceof Error && error.message.includes('Model not found')) {
          return reply.code(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/sessions/:id/messages',
    async (request, reply) => {
      try {
        return { messages: pool.getMessages(request.params.id) };
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/sessions/:id',
    async (request, reply) => {
      const removed = pool.remove(request.params.id);
      if (!removed) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return { ok: true };
    },
  );
}
