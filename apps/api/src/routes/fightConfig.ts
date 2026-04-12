import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import { guildConfig } from '@lot/shared/guild.config.js';

const FightConfigSchema = z.object({
    configs: z.array(
        z.object({
            encounterId: z.number().int(),
            difficulty: z.enum(['NORMAL', 'HEROIC', 'MYTHIC']),
            category: z.enum(['PROGRESSION', 'FARM', 'IGNORED']),
        })
    ),
});

export async function registerFightConfigRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        '/api/fight-config',
        { preHandler: requireAuth },
        async (_request, reply) => {
            const guild = await prisma.guild.findUnique({
                where: { wclId: guildConfig.wclGuildId },
                select: { id: true },
            });
            if (!guild) {
                return reply.code(404).send({ error: 'Guild not found' });
            }

            const configs = await prisma.fightConfig.findMany({
                where: { guildId: guild.id },
                select: {
                    encounterId: true,
                    difficulty: true,
                    category: true,
                },
            });

            return { configs };
        }
    );

    app.put(
        '/api/fight-config',
        { preHandler: requireAdmin },
        async (request, reply) => {
            const parsed = FightConfigSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.code(400).send({
                    error: 'Invalid request',
                    details: parsed.error.issues,
                });
            }

            const guild = await prisma.guild.findUnique({
                where: { wclId: guildConfig.wclGuildId },
                select: { id: true },
            });
            if (!guild) {
                return reply.code(404).send({ error: 'Guild not found' });
            }

            const upserts = parsed.data.configs.map((c) =>
                prisma.fightConfig.upsert({
                    where: {
                        guildId_encounterId_difficulty: {
                            guildId: guild.id,
                            encounterId: c.encounterId,
                            difficulty: c.difficulty,
                        },
                    },
                    update: { category: c.category },
                    create: {
                        guildId: guild.id,
                        encounterId: c.encounterId,
                        difficulty: c.difficulty,
                        category: c.category,
                    },
                })
            );

            await prisma.$transaction(upserts);

            const configs = await prisma.fightConfig.findMany({
                where: { guildId: guild.id },
                select: {
                    encounterId: true,
                    difficulty: true,
                    category: true,
                },
            });

            return { configs };
        }
    );
}
