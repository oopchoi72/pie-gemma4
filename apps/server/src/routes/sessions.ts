import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { SessionNotFoundError, type SessionPool } from '../pie/session-pool.js';

export async function registerSessionRoutes(
  app: FastifyInstance,
  pool: SessionPool,
) {
  app.get('/api/health', async () => ({
    ok: true,
    mode: config.pieMode,
    model: `${config.provider}/${config.modelName}`,
  }));

  app.get('/api/sessions', async () => ({
    sessions: pool.list(),
  }));

  app.post<{ Body: { name?: string } }>('/api/sessions', async (request) => {
    const meta = await pool.create(request.body?.name);
    return meta;
  });

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
