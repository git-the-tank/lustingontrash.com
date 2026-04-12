import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerHealthRoutes } from './routes/health.js';
import { registerCharacterRoutes } from './routes/characters.js';
import { registerParsesRoutes } from './routes/parses.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerFightConfigRoutes } from './routes/fightConfig.js';
import { registerDashboardRoutes } from './routes/dashboard.js';

export async function createApp(): Promise<FastifyInstance> {
    const app = Fastify({ logger: true });
    const isProd = process.env.NODE_ENV === 'production';

    await app.register(cors, {
        origin: process.env.CORS_ORIGIN?.split(',') ?? [
            'http://localhost:3000',
        ],
        credentials: true,
    });

    await app.register(cookie, {
        secret: process.env.COOKIE_SECRET,
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
    await app.register(registerAuthRoutes);
    await app.register(registerCharacterRoutes);
    await app.register(registerParsesRoutes);
    await app.register(registerFightConfigRoutes);
    await app.register(registerDashboardRoutes);

    return app;
}
