import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { syncParses } from '../jobs/syncParses.js';
import { recordSync, checkSyncCooldown } from '../jobs/syncLog.js';
import { requireAdmin } from '../auth/middleware.js';

const LogQuerySchema = z.object({
    type: z.enum(['ROSTER', 'PARSES']),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function registerSyncRoutes(app: FastifyInstance): Promise<void> {
    app.post(
        '/api/sync/parses',
        {
            preHandler: requireAdmin,
            schema: {
                tags: ['sync'],
                description:
                    'Sync WCL parses for all active characters. May take a minute.',
            },
        },
        async (request, reply) => {
            const cooldown = await checkSyncCooldown(
                'PARSES',
                request.user?.guildRank ?? null
            );
            if (!cooldown.allowed) {
                return reply.code(429).send({
                    error: 'Cooldown',
                    message:
                        'Parse sync is available once per day. Next run available at the time below.',
                    nextAvailableAt: cooldown.nextAvailableAt,
                    lastStartedAt: cooldown.lastStartedAt,
                });
            }
            return recordSync('PARSES', () => syncParses());
        }
    );

    app.get(
        '/api/sync/log',
        {
            preHandler: requireAdmin,
            schema: {
                tags: ['sync'],
                description: 'Recent sync runs for a given sync type',
            },
        },
        async (request, reply) => {
            const parsed = LogQuerySchema.safeParse(request.query);
            if (!parsed.success) {
                return reply.code(400).send({
                    error: 'Invalid query',
                    details: parsed.error.issues,
                });
            }
            const logs = await prisma.syncLog.findMany({
                where: { type: parsed.data.type },
                orderBy: { startedAt: 'desc' },
                take: parsed.data.limit,
                select: {
                    id: true,
                    type: true,
                    status: true,
                    startedAt: true,
                    completedAt: true,
                    durationMs: true,
                    summary: true,
                    details: true,
                    error: true,
                },
            });
            return { logs };
        }
    );
}
