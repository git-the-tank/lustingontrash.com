import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/index.js';
import { syncCharacters, previewCharacters } from '../jobs/syncCharacters.js';
import { requireAuth } from '../auth/middleware.js';

export async function registerCharacterRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        '/api/characters',
        {
            preHandler: requireAuth,
            schema: {
                tags: ['characters'],
                description:
                    'List synced guild members (active only by default, ?all=true for all)',
                querystring: {
                    type: 'object',
                    properties: {
                        all: { type: 'boolean', default: false },
                    },
                },
                response: {
                    200: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                wowauditId: { type: 'integer' },
                                name: { type: 'string' },
                                server: { type: 'string' },
                                className: { type: 'string' },
                                role: { type: 'string' },
                                rank: { type: 'string' },
                                active: { type: 'boolean' },
                                guild: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (request) => {
            const { all } = request.query as { all?: boolean };
            const characters = await prisma.character.findMany({
                where: all ? {} : { active: true },
                include: { guild: true },
                orderBy: { name: 'asc' },
            });
            return characters;
        }
    );

    app.get(
        '/api/sync/characters/preview',
        {
            preHandler: requireAuth,
            schema: {
                tags: ['sync'],
                description:
                    'Preview which characters would be synced from wowaudit (dry run — no DB writes)',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            guild: { type: 'string' },
                            total: { type: 'integer' },
                            filtered: { type: 'integer' },
                            characters: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        wowauditId: { type: 'integer' },
                                        name: { type: 'string' },
                                        server: { type: 'string' },
                                        className: { type: 'string' },
                                        role: { type: 'string' },
                                        rank: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        async () => {
            return previewCharacters();
        }
    );

    app.post(
        '/api/sync/characters',
        {
            preHandler: requireAuth,
            schema: {
                tags: ['sync'],
                description:
                    'Sync guild members from wowaudit (uses guild.config.ts)',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            guild: { type: 'string' },
                            synced: { type: 'integer' },
                            filtered: { type: 'integer' },
                            deactivated: { type: 'integer' },
                        },
                    },
                },
            },
        },
        async () => {
            const result = await syncCharacters();
            return result;
        }
    );
}
