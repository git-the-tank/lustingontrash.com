import 'dotenv/config';
import { prisma } from '../db/index.js';
import { getWclClient } from '../wcl/client.js';
import { CHARACTER_ZONE_RANKINGS_QUERY } from '../wcl/queries.js';
import { guildConfig } from '@lot/shared/guild.config.js';
import {
    DIFFICULTIES,
    DIFFICULTY_WCL_ID,
    ENCOUNTER_BY_ID,
    MIDNIGHT_S1_ZONE_ID,
    type Difficulty,
} from '@lot/shared/encounters.config.js';

// Shape of a single entry in zoneRankings.rankings[] for a character.
// The field is returned as a JSON scalar so we hand-type it here.
type ZoneRankingEntry = {
    encounter: { id: number; name: string };
    rankPercent?: number | null;
    medianPercent?: number | null;
    totalKills?: number | null;
    bestSpec?: string | null;
    bestAmount?: number | null;
    fastestKill?: number | null; // ms
    lockedIn?: boolean;
};

type ZoneRankingsJson = {
    bestPerformanceAverage?: number | null;
    medianPerformanceAverage?: number | null;
    difficulty: number;
    metric: string;
    partition: number;
    zone: number;
    rankings: ZoneRankingEntry[];
};

type Response = {
    characterData: {
        character: {
            id: number;
            zoneRankings: ZoneRankingsJson | null;
        } | null;
    };
};

type Metric = 'dps' | 'hps';

function metricForRole(role: string): Metric {
    // wowaudit stores healers as 'Heal'; match any string starting with 'heal'
    // to be safe against future variants.
    return role.toLowerCase().startsWith('heal') ? 'hps' : 'dps';
}

function serverSlug(server: string): string {
    return server.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export interface SyncParsesResult {
    characters: number;
    charactersWithData: number;
    parses: number;
    errors: { character: string; error: string }[];
}

export async function syncParses(): Promise<SyncParsesResult> {
    const characters = await prisma.character.findMany({
        where: { active: true },
        select: {
            id: true,
            name: true,
            server: true,
            role: true,
            roleOverride: true,
        },
        orderBy: [{ name: 'asc' }],
    });

    let client;
    try {
        client = await getWclClient();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            characters: characters.length,
            charactersWithData: 0,
            parses: 0,
            errors: [{ character: 'WCL auth', error: msg }],
        };
    }
    const errors: SyncParsesResult['errors'] = [];
    let parsesUpserted = 0;
    const charactersWithData = new Set<string>();

    for (const char of characters) {
        const metric = metricForRole(char.roleOverride ?? char.role);
        const slug = serverSlug(char.server);

        for (const difficulty of DIFFICULTIES) {
            const diffId = DIFFICULTY_WCL_ID[difficulty];

            try {
                const result = await client.request<Response>(
                    CHARACTER_ZONE_RANKINGS_QUERY,
                    {
                        name: char.name,
                        serverSlug: slug,
                        serverRegion: guildConfig.region,
                        zoneId: MIDNIGHT_S1_ZONE_ID,
                        difficulty: diffId,
                        metric,
                    }
                );

                const wclChar = result.characterData.character;
                if (!wclChar || !wclChar.zoneRankings) {
                    // Character not on WCL or no logs for this difficulty.
                    continue;
                }

                const rankings = wclChar.zoneRankings.rankings ?? [];
                for (const ranking of rankings) {
                    if (ranking.rankPercent == null) continue;
                    if (!ENCOUNTER_BY_ID.has(ranking.encounter.id)) continue;

                    await upsertParse(char.id, difficulty, metric, ranking);
                    parsesUpserted += 1;
                    charactersWithData.add(char.id);
                }
            } catch (err) {
                // Truncate error to avoid leaking WCL response bodies in logs.
                const raw = err instanceof Error ? err.message : String(err);
                const msg = raw.length > 200 ? raw.slice(0, 200) + '...' : raw;
                errors.push({
                    character: `${char.name}/${char.server}/${difficulty}`,
                    error: msg,
                });
            }

            // Courtesy spacing against WCL rate limits (~300 req/min).
            await sleep(100);
        }
    }

    return {
        characters: characters.length,
        charactersWithData: charactersWithData.size,
        parses: parsesUpserted,
        errors,
    };
}

async function upsertParse(
    characterId: string,
    difficulty: Difficulty,
    metric: Metric,
    ranking: ZoneRankingEntry
): Promise<void> {
    const data = {
        metric,
        bestPercent: ranking.rankPercent ?? 0,
        medianPercent: ranking.medianPercent ?? null,
        bestAmount: ranking.bestAmount ?? null,
        bestSpec: ranking.bestSpec ?? null,
        fastestKillMs: ranking.fastestKill ?? null,
        killCount: ranking.totalKills ?? 0,
        syncedAt: new Date(),
    };

    await prisma.parse.upsert({
        where: {
            characterId_encounterId_difficulty: {
                characterId,
                encounterId: ranking.encounter.id,
                difficulty,
            },
        },
        update: data,
        create: {
            characterId,
            encounterId: ranking.encounter.id,
            difficulty,
            ...data,
        },
    });
}

// CLI entry point — `pnpm run db:sync:parses`
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    syncParses()
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
