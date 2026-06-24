import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config.js';
import { SessionPool } from './pie/session-pool.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerSessionRoutes } from './routes/sessions.js';

async function main() {
  const app = Fastify({ logger: true });
  const pool = new SessionPool(config.pieMode);

  await app.register(cors, {
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  });

  await registerSessionRoutes(app, pool);
  await registerChatRoutes(app, pool);

  await app.listen({ host: config.host, port: config.port });
  app.log.info(
    `pie-gemma4 server listening on http://${config.host}:${config.port} (mode=${config.pieMode})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
