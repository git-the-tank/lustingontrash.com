import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerHealthRoutes } from './routes/health.js';
import { registerCharacterRoutes } from './routes/characters.js';

export async function createApp(): Promise<FastifyInstance> {
    const app = Fastify({ logger: true });
    const isProd = process.env.NODE_ENV === 'production';

    await app.register(cors, {
        origin: process.env.CORS_ORIGIN?.split(',') ?? [
            'http://localhost:3000',
        ],
    });

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

    return app;
}
