import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { syncCharacters, previewCharacters } from '../jobs/syncCharacters.js';
import { recordSync, checkSyncCooldown } from '../jobs/syncLog.js';
import { requireAuth, requireAdmin } from '../auth/middleware.js';

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
                                roleOverride: { type: ['string', 'null'] },
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
            preHandler: requireAdmin,
            schema: {
                tags: ['sync'],
                description:
                    'Sync guild members from wowaudit (uses guild.config.ts)',
            },
        },
        async (request, reply) => {
            const cooldown = await checkSyncCooldown(
                'ROSTER',
                request.user?.guildRank ?? null
            );
            if (!cooldown.allowed) {
                return reply.code(429).send({
                    error: 'Cooldown',
                    message:
                        'Roster sync is available once per hour. Next run available at the time below.',
                    nextAvailableAt: cooldown.nextAvailableAt,
                    lastStartedAt: cooldown.lastStartedAt,
                });
            }
            return recordSync('ROSTER', () => syncCharacters());
        }
    );

    const RoleOverrideSchema = z.object({
        roleOverride: z.enum(['Tank', 'Heal', 'Melee', 'Ranged']).nullable(),
    });

    app.patch(
        '/api/admin/characters/:id',
        {
            preHandler: requireAdmin,
            schema: {
                tags: ['admin'],
                description: 'Update admin-managed fields on a character',
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const parsed = RoleOverrideSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.code(400).send({
                    error: 'Invalid request',
                    details: parsed.error.issues,
                });
            }

            const existing = await prisma.character.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!existing) {
                return reply.code(404).send({ error: 'Character not found' });
            }

            const updated = await prisma.character.update({
                where: { id },
                data: { roleOverride: parsed.data.roleOverride },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    roleOverride: true,
                },
            });
            return updated;
        }
    );
}
