import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/index.js';
import { requireAuth } from '../auth/middleware.js';
import { ENCOUNTERS } from '@lot/shared/encounters.config.js';
import { guildConfig } from '@lot/shared/guild.config.js';
import { isRoleMatch, rankingRoleGroup } from '@lot/shared/specs.config.js';
import type { Difficulty, FightCategory } from '../generated/prisma/client.js';

const CURRENT_ENCOUNTER_IDS = ENCOUNTERS.map((e) => e.id);

type FightKey = `${number}:${string}`;

function fightKey(encounterId: number, difficulty: string): FightKey {
    return `${encounterId}:${difficulty}`;
}

interface CharacterScore {
    characterId: string;
    score: number | null;
    fightCount: number;
}

function computeScores(
    characters: Array<{
        id: string;
        className: string;
        role: string;
        parses: Array<{
            encounterId: number;
            difficulty: Difficulty;
            bestPercent: number;
            bestSpec: string | null;
        }>;
    }>,
    includedFights: Set<FightKey>
): CharacterScore[] {
    return characters.map((char) => {
        const validParses = char.parses.filter(
            (p) =>
                includedFights.has(fightKey(p.encounterId, p.difficulty)) &&
                isRoleMatch(char.role, char.className, p.bestSpec)
        );

        const score =
            validParses.length > 0
                ? validParses.reduce((sum, p) => sum + p.bestPercent, 0) /
                  validParses.length
                : null;

        return {
            characterId: char.id,
            score,
            fightCount: validParses.length,
        };
    });
}

interface RankResult {
    rank: number;
    total: number;
    label: string;
}

function computeRank(
    targetScore: number,
    allScores: CharacterScore[],
    label: string
): RankResult | null {
    const scored = allScores.filter((s) => s.score !== null);
    if (scored.length <= 1) return null;
    const sorted = scored.map((s) => s.score as number).sort((a, b) => b - a);
    const rank = sorted.findIndex((s) => s <= targetScore) + 1;
    return { rank, total: sorted.length, label };
}

export async function registerDashboardRoutes(
    app: FastifyInstance
): Promise<void> {
    const dashboardHandler = async (
        request: import('fastify').FastifyRequest,
        reply: import('fastify').FastifyReply
    ): Promise<unknown> => {
        const userId = request.user!.sub;

        const guild = await prisma.guild.findUnique({
            where: { wclId: guildConfig.wclGuildId },
            select: { id: true },
        });
        if (!guild) {
            return reply.code(404).send({ error: 'Guild not found' });
        }

        // Load fight config
        const fightConfigs = await prisma.fightConfig.findMany({
            where: { guildId: guild.id },
            select: {
                encounterId: true,
                difficulty: true,
                category: true,
            },
        });

        const configMap = new Map<FightKey, FightCategory>();
        for (const fc of fightConfigs) {
            configMap.set(fightKey(fc.encounterId, fc.difficulty), fc.category);
        }

        // Build fight sets for scoring
        const progFights = new Set<FightKey>();
        const overallFights = new Set<FightKey>();
        for (const [key, category] of configMap) {
            if (category === 'PROGRESSION') {
                progFights.add(key);
                overallFights.add(key);
            } else if (category === 'FARM') {
                overallFights.add(key);
            }
        }

        // Load all active characters with parses
        const allCharacters = await prisma.character.findMany({
            where: { active: true, guildId: guild.id },
            select: {
                id: true,
                name: true,
                server: true,
                className: true,
                role: true,
                rank: true,
                userId: true,
                parses: {
                    where: { encounterId: { in: CURRENT_ENCOUNTER_IDS } },
                    select: {
                        encounterId: true,
                        difficulty: true,
                        bestPercent: true,
                        bestSpec: true,
                    },
                },
            },
        });

        // Count guild-wide participation per (encounter, difficulty).
        // Exclude fights with fewer than LP_THRESHOLD parses — the guild
        // doesn't have meaningful data for those yet.
        const LP_THRESHOLD = 15;
        const participationCount = new Map<FightKey, number>();
        for (const char of allCharacters) {
            for (const p of char.parses) {
                const key = fightKey(p.encounterId, p.difficulty);
                participationCount.set(
                    key,
                    (participationCount.get(key) ?? 0) + 1
                );
            }
        }
        for (const key of [...progFights]) {
            if ((participationCount.get(key) ?? 0) < LP_THRESHOLD) {
                progFights.delete(key);
            }
        }
        for (const key of [...overallFights]) {
            if ((participationCount.get(key) ?? 0) < LP_THRESHOLD) {
                overallFights.delete(key);
            }
        }

        // Compute scores for all characters
        const progScores = computeScores(allCharacters, progFights);
        const overallScores = computeScores(allCharacters, overallFights);

        // Build lookup maps
        const progScoreMap = new Map(progScores.map((s) => [s.characterId, s]));
        const overallScoreMap = new Map(
            overallScores.map((s) => [s.characterId, s])
        );

        // Determine which characters to show
        const characterName = (request.params as { characterName?: string })
            .characterName;
        const targetCharacters = characterName
            ? allCharacters.filter(
                  (c) => c.name.toLowerCase() === characterName.toLowerCase()
              )
            : allCharacters.filter((c) => c.userId === userId);

        if (targetCharacters.length === 0) {
            if (characterName) {
                return reply
                    .code(404)
                    .send({ error: `Character "${characterName}" not found` });
            }
            // No characters linked to user — return empty
        }

        // Build ranking groups
        const charMeta = new Map(
            allCharacters.map((c) => [
                c.id,
                {
                    className: c.className,
                    role: c.role,
                    roleGroup: rankingRoleGroup(c.role),
                },
            ])
        );

        function getRankings(
            characterId: string,
            scores: CharacterScore[],
            scoreMap: Map<string, CharacterScore>
        ): { classRank: RankResult | null; roleRank: RankResult | null } {
            const myScore = scoreMap.get(characterId);
            if (!myScore?.score) return { classRank: null, roleRank: null };

            const meta = charMeta.get(characterId)!;

            // Class + role rank
            const classRoleScores = scores.filter((s) => {
                const m = charMeta.get(s.characterId);
                return (
                    m &&
                    m.className === meta.className &&
                    m.roleGroup === meta.roleGroup
                );
            });
            const classRank = computeRank(
                myScore.score,
                classRoleScores,
                `${meta.roleGroup} ${meta.className}s`
            );

            // Role rank (Melee+Ranged = DPS)
            const roleScores = scores.filter((s) => {
                const m = charMeta.get(s.characterId);
                return m && m.roleGroup === meta.roleGroup;
            });
            const roleLabel =
                meta.roleGroup === 'DPS'
                    ? 'DPS'
                    : meta.roleGroup === 'Heal'
                      ? 'Healers'
                      : 'Tanks';
            const roleRank = computeRank(myScore.score, roleScores, roleLabel);

            return { classRank, roleRank };
        }

        // Build response for target characters
        const characters = targetCharacters.map((char) => {
            const progScore = progScoreMap.get(char.id);
            const overallScore = overallScoreMap.get(char.id);
            const progRankings = getRankings(char.id, progScores, progScoreMap);
            const overallRankings = getRankings(
                char.id,
                overallScores,
                overallScoreMap
            );

            // Per-fight breakdown
            const fights = char.parses.map((p) => {
                const key = fightKey(p.encounterId, p.difficulty);
                const category = configMap.get(key) ?? 'IGNORED';
                const roleMatch = isRoleMatch(
                    char.role,
                    char.className,
                    p.bestSpec
                );
                return {
                    encounterId: p.encounterId,
                    difficulty: p.difficulty,
                    category,
                    bestPercent: p.bestPercent,
                    bestSpec: p.bestSpec,
                    excluded: !roleMatch,
                    excludeReason: !roleMatch
                        ? `${p.bestSpec} is not a ${char.role} spec`
                        : undefined,
                };
            });

            return {
                id: char.id,
                name: char.name,
                className: char.className,
                role: char.role,
                rank: char.rank,
                progression: {
                    score: progScore?.score ?? null,
                    fightCount: progScore?.fightCount ?? 0,
                    totalFights: progFights.size,
                    classRank: progRankings.classRank,
                    roleRank: progRankings.roleRank,
                },
                overall: {
                    score: overallScore?.score ?? null,
                    fightCount: overallScore?.fightCount ?? 0,
                    totalFights: overallFights.size,
                    classRank: overallRankings.classRank,
                    roleRank: overallRankings.roleRank,
                },
                fights,
            };
        });

        return {
            characters,
            fightConfig: fightConfigs.map((fc) => ({
                encounterId: fc.encounterId,
                difficulty: fc.difficulty,
                category: fc.category,
            })),
            encounters: ENCOUNTERS,
        };
    };

    app.get('/api/dashboard', { preHandler: requireAuth }, dashboardHandler);
    app.get(
        '/api/dashboard/:characterName',
        { preHandler: requireAuth },
        dashboardHandler
    );
}
