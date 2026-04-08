import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import { registerHealthRoutes } from './routes/health.js';
import { registerCharacterRoutes } from './routes/characters.js';

export async function createApp(): Promise<FastifyInstance> {
    const app = Fastify({ logger: true });
    const isProd = process.env.NODE_ENV === 'production';

    await app.register(cors, { origin: true });

    if (!isProd) {
        await app.register(swagger, {
            openapi: {
                info: {
                    title: 'parseboard API',
                    version: '0.1.0',
                    description:
                        'Warcraft Logs data analysis tool for guild raider comparison',
                },
            },
        });
        await app.register(swaggerUi, {
            routePrefix: '/docs',
        });
    }

    await app.register(registerHealthRoutes);
    await app.register(registerCharacterRoutes);

    if (isProd) {
        const clientDir = path.join(import.meta.dirname, '../../dist/client');
        await app.register(fastifyStatic, { root: clientDir });
        app.setNotFoundHandler((_req, reply) => {
            return reply.sendFile('index.html');
        });
    }

    return app;
}
