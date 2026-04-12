import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/index.js';
import { requireAuth } from '../auth/middleware.js';
import {
    DIFFICULTIES,
    ENCOUNTERS,
    MIDNIGHT_S1_ZONE_ID,
    RAIDS,
} from '@lot/shared/encounters.config.js';
import { guildConfig } from '@lot/shared/guild.config.js';

const CURRENT_ENCOUNTER_IDS = ENCOUNTERS.map((e) => e.id);

export async function registerParsesRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        '/api/parses',
        {
            preHandler: requireAuth,
            schema: {
                tags: ['parses'],
                description:
                    'Every active character with their best parse per (encounter, difficulty) for the current raid tier. Guild-member only.',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            zoneId: { type: 'integer' },
                            difficulties: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                            raids: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        key: { type: 'string' },
                                        name: { type: 'string' },
                                        short: { type: 'string' },
                                    },
                                },
                            },
                            encounters: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'integer' },
                                        raid: { type: 'string' },
                                        name: { type: 'string' },
                                        short: { type: 'string' },
                                        order: { type: 'integer' },
                                    },
                                },
                            },
                            rows: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        character: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                name: { type: 'string' },
                                                server: { type: 'string' },
                                                className: { type: 'string' },
                                                role: { type: 'string' },
                                            },
                                        },
                                        parses: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    encounterId: {
                                                        type: 'integer',
                                                    },
                                                    difficulty: {
                                                        type: 'string',
                                                    },
                                                    metric: { type: 'string' },
                                                    bestPercent: {
                                                        type: 'number',
                                                    },
                                                    medianPercent: {
                                                        type: [
                                                            'number',
                                                            'null',
                                                        ],
                                                    },
                                                    bestAmount: {
                                                        type: [
                                                            'number',
                                                            'null',
                                                        ],
                                                    },
                                                    bestSpec: {
                                                        type: [
                                                            'string',
                                                            'null',
                                                        ],
                                                    },
                                                    fastestKillMs: {
                                                        type: [
                                                            'integer',
                                                            'null',
                                                        ],
                                                    },
                                                    killCount: {
                                                        type: 'integer',
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    404: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
        },
        async (_request, reply) => {
            const guild = await prisma.guild.findUnique({
                where: { wclId: guildConfig.wclGuildId },
                select: { id: true },
            });
            if (!guild) {
                return reply.code(404).send({ error: 'Guild not found' });
            }

            const characters = await prisma.character.findMany({
                where: { active: true, guildId: guild.id },
                select: {
                    id: true,
                    name: true,
                    server: true,
                    className: true,
                    role: true,
                    parses: {
                        where: {
                            encounterId: { in: CURRENT_ENCOUNTER_IDS },
                        },
                        select: {
                            encounterId: true,
                            difficulty: true,
                            metric: true,
                            bestPercent: true,
                            medianPercent: true,
                            bestAmount: true,
                            bestSpec: true,
                            fastestKillMs: true,
                            killCount: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });

            return {
                zoneId: MIDNIGHT_S1_ZONE_ID,
                difficulties: DIFFICULTIES,
                raids: RAIDS,
                encounters: ENCOUNTERS,
                rows: characters.map((c) => ({
                    character: {
                        id: c.id,
                        name: c.name,
                        server: c.server,
                        className: c.className,
                        role: c.role,
                    },
                    parses: c.parses,
                })),
            };
        }
    );
}
