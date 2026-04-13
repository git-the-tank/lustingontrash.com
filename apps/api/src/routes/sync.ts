import type { FastifyInstance } from 'fastify';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/index.js';
import { requireAdmin } from '../auth/middleware.js';
import { syncReports, type SyncReportsResult } from '../jobs/syncReports.js';

export async function registerSyncRoutes(app: FastifyInstance): Promise<void> {
    // Trigger a one-shot report discovery + spine ingest.
    // Extended timeout: a cold first run can take 30–60 s.
    app.post(
        '/api/sync/reports',
        { preHandler: requireAdmin },
        async (_request, reply): Promise<SyncReportsResult> => {
            const startedAt = new Date();
            try {
                const result = await syncReports();
                const completedAt = new Date();
                await prisma.syncLog.create({
                    data: {
                        type: 'REPORTS',
                        status:
                            result.errors.length === 0 ? 'SUCCESS' : 'FAILED',
                        startedAt,
                        completedAt,
                        durationMs: completedAt.getTime() - startedAt.getTime(),
                        summary: `Discovered ${result.reportsDiscovered} reports, ingested ${result.fightsIngested} fights`,
                        details: result as unknown as Prisma.InputJsonValue,
                        error:
                            result.errors.length > 0
                                ? result.errors
                                      .map(
                                          (e) =>
                                              `${e.report ?? 'unknown'}: ${e.error}`
                                      )
                                      .join('; ')
                                      .slice(0, 500)
                                : null,
                    },
                });
                return result;
            } catch (err) {
                const completedAt = new Date();
                const msg = err instanceof Error ? err.message : String(err);
                await prisma.syncLog.create({
                    data: {
                        type: 'REPORTS',
                        status: 'FAILED',
                        startedAt,
                        completedAt,
                        durationMs: completedAt.getTime() - startedAt.getTime(),
                        summary: 'Report sync failed',
                        error: msg.slice(0, 500),
                    },
                });
                return reply
                    .code(500)
                    .send({ error: 'Sync failed', detail: msg.slice(0, 200) });
            }
        }
    );

    // Last N sync log entries across all types, most-recent first.
    app.get('/api/sync/logs', { preHandler: requireAdmin }, async () => {
        const logs = await prisma.syncLog.findMany({
            orderBy: { startedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                type: true,
                status: true,
                startedAt: true,
                completedAt: true,
                durationMs: true,
                summary: true,
                error: true,
            },
        });
        return { logs };
    });
}
