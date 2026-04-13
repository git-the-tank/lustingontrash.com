import 'dotenv/config';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/index.js';
import { getWclClient } from '../wcl/client.js';
import { GUILD_REPORTS_QUERY, REPORT_SPINE_QUERY } from '../wcl/queries.js';
import { guildConfig } from '@lot/shared/guild.config.js';
import {
    DIFFICULTY_WCL_ID,
    MIDNIGHT_S1_START_MS,
    type Difficulty,
} from '@lot/shared/encounters.config.js';

// ─── WCL response types ───────────────────────────────────────────────────────

type WclReportStub = {
    code: string;
    startTime: number;
    endTime: number;
    title: string | null;
    zone: { id: number } | null;
};

type WclReportsPage = {
    data: WclReportStub[];
    has_more_pages: boolean | null;
    current_page: number | null;
};

type GuildReportsResponse = {
    guildData: {
        guild: {
            reports: WclReportsPage;
        } | null;
    };
};

type WclPhaseTransition = {
    id: number;
    startTime: number;
};

type WclFight = {
    id: number;
    name: string | null;
    encounterID: number;
    difficulty: number;
    kill: boolean | null;
    startTime: number;
    endTime: number;
    bossPercentage: number | null;
    fightPercentage: number | null;
    phaseTransitions: WclPhaseTransition[] | null;
};

type WclActor = {
    id: number;
    name: string;
    type: string;
    subType: string | null;
    gameID: number | null;
    guid: string | null;
};

type WclAbility = {
    gameID: number;
    name: string;
    icon: string | null;
};

type WclReportSpine = {
    startTime: number;
    endTime: number;
    title: string | null;
    zone: { id: number } | null;
    fights: WclFight[];
    masterData: {
        actors: WclActor[];
        abilities: WclAbility[];
    };
};

type ReportSpineResponse = {
    reportData: {
        report: WclReportSpine | null;
    };
};

// ─── Difficulty mapping ───────────────────────────────────────────────────────

const WCL_DIFFICULTY_MAP: Record<number, Difficulty> = {
    [DIFFICULTY_WCL_ID.NORMAL]: 'NORMAL',
    [DIFFICULTY_WCL_ID.HEROIC]: 'HEROIC',
    [DIFFICULTY_WCL_ID.MYTHIC]: 'MYTHIC',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface SyncReportsResult {
    reportsDiscovered: number;
    fightsIngested: number;
    actorsNormalized: number;
    abilitiesNormalized: number;
    npcsNormalized: number;
    errors: { report?: string; error: string }[];
}

// ─── Main job ─────────────────────────────────────────────────────────────────

export async function syncReports(): Promise<SyncReportsResult> {
    const errors: SyncReportsResult['errors'] = [];
    let fightsIngested = 0;
    let actorsNormalized = 0;
    let abilitiesNormalized = 0;
    let npcsNormalized = 0;

    // 1. Resolve guild
    const guild = await prisma.guild.findUnique({
        where: { wclId: guildConfig.wclGuildId },
        select: { id: true },
    });
    if (!guild) {
        return {
            reportsDiscovered: 0,
            fightsIngested: 0,
            actorsNormalized: 0,
            abilitiesNormalized: 0,
            npcsNormalized: 0,
            errors: [
                {
                    error: `Guild wclId ${guildConfig.wclGuildId} not found in DB`,
                },
            ],
        };
    }

    // 2. Compute watermark: max existing startTime minus 2-day overlap; floor at tier start
    const latest = await prisma.report.findFirst({
        where: { guildId: guild.id },
        orderBy: { startTime: 'desc' },
        select: { startTime: true },
    });
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const watermarkMs = latest
        ? Math.max(
              latest.startTime.getTime() - TWO_DAYS_MS,
              MIDNIGHT_S1_START_MS
          )
        : MIDNIGHT_S1_START_MS;

    // 3. Get WCL client
    let client;
    try {
        client = await getWclClient();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            reportsDiscovered: 0,
            fightsIngested: 0,
            actorsNormalized: 0,
            abilitiesNormalized: 0,
            npcsNormalized: 0,
            errors: [{ error: `WCL auth failed: ${msg}` }],
        };
    }

    // 4. Paginated report discovery
    const reportStubs: WclReportStub[] = [];
    let page = 1;
    while (true) {
        const result = await client.request<GuildReportsResponse>(
            GUILD_REPORTS_QUERY,
            { id: guildConfig.wclGuildId, startTime: watermarkMs, page }
        );
        const reports = result.guildData.guild?.reports;
        if (!reports) break;
        reportStubs.push(...reports.data);
        if (!reports.has_more_pages) break;
        page = (reports.current_page ?? page) + 1;
        await sleep(100);
    }

    // 5. Ingest each report
    for (const stub of reportStubs) {
        try {
            await ingestReport(client, guild.id, stub);
            const counts = await countReportRows(stub.code);
            fightsIngested += counts.fights;
            actorsNormalized += counts.actors;
            abilitiesNormalized += counts.abilities;
            npcsNormalized += counts.npcs;
        } catch (err) {
            const raw = err instanceof Error ? err.message : String(err);
            errors.push({
                report: stub.code,
                error: raw.length > 200 ? raw.slice(0, 200) + '...' : raw,
            });
        }
        await sleep(100);
    }

    return {
        reportsDiscovered: reportStubs.length,
        fightsIngested,
        actorsNormalized,
        abilitiesNormalized,
        npcsNormalized,
        errors,
    };
}

// ─── Per-report ingest ────────────────────────────────────────────────────────

async function ingestReport(
    client: Awaited<ReturnType<typeof getWclClient>>,
    guildId: string,
    stub: WclReportStub
): Promise<void> {
    // Fetch spine
    const spineResult = await client.request<ReportSpineResponse>(
        REPORT_SPINE_QUERY,
        { code: stub.code }
    );
    const spine = spineResult.reportData.report;
    if (!spine) return;

    // Raw-cache payload
    await prisma.rawPayloadCache.create({
        data: {
            reportCode: stub.code,
            sourceType: 'REPORT_SPINE',
            fightId: null,
            payload: spine as unknown as Prisma.InputJsonValue,
        },
    });

    // Determine state
    const FIFTEEN_MIN_MS = 15 * 60 * 1000;
    const state: 'LIVE' | 'FINAL' =
        spine.endTime > Date.now() - FIFTEEN_MIN_MS ? 'LIVE' : 'FINAL';

    // Upsert Report row
    const reportData = {
        guildId,
        title: spine.title ?? null,
        zoneId: spine.zone?.id ?? null,
        startTime: new Date(spine.startTime),
        endTime: new Date(spine.endTime),
        state,
        lastFetchedAt: new Date(),
    };
    const report = await prisma.report.upsert({
        where: { code: stub.code },
        update: reportData,
        create: { code: stub.code, ...reportData },
        select: { id: true },
    });

    // Fetch existing fightIds to detect new/changed fights
    const existingFights = await prisma.fight.findMany({
        where: { reportId: report.id },
        select: { fightId: true, endTime: true },
    });
    const existingMap = new Map(
        existingFights.map((f) => [f.fightId, f.endTime])
    );

    // Upsert fights
    for (const fight of spine.fights) {
        const difficulty = WCL_DIFFICULTY_MAP[fight.difficulty];
        if (!difficulty) continue; // skip LFR and other non-tracked difficulties

        const existingEnd = existingMap.get(fight.id);
        if (existingEnd !== undefined && existingEnd === fight.endTime)
            continue; // unchanged

        await prisma.fight.upsert({
            where: {
                reportId_fightId: { reportId: report.id, fightId: fight.id },
            },
            update: {
                encounterId: fight.encounterID,
                difficulty,
                name: fight.name ?? null,
                kill: fight.kill ?? false,
                startTime: fight.startTime,
                endTime: fight.endTime,
                bossPercentage: fight.bossPercentage ?? null,
                fightPercentage: fight.fightPercentage ?? null,
                phaseTransitions: fight.phaseTransitions
                    ? (fight.phaseTransitions as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
            },
            create: {
                reportId: report.id,
                fightId: fight.id,
                encounterId: fight.encounterID,
                difficulty,
                name: fight.name ?? null,
                kill: fight.kill ?? false,
                startTime: fight.startTime,
                endTime: fight.endTime,
                bossPercentage: fight.bossPercentage ?? null,
                fightPercentage: fight.fightPercentage ?? null,
                phaseTransitions: fight.phaseTransitions
                    ? (fight.phaseTransitions as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
            },
        });
    }

    // Upsert actors
    for (const actor of spine.masterData.actors) {
        await prisma.actor.upsert({
            where: {
                reportId_actorId: { reportId: report.id, actorId: actor.id },
            },
            update: {
                guid: actor.guid ?? '',
                name: actor.name,
                type: actor.type,
                subType: actor.subType ?? null,
            },
            create: {
                reportId: report.id,
                actorId: actor.id,
                guid: actor.guid ?? '',
                name: actor.name,
                type: actor.type,
                subType: actor.subType ?? null,
            },
        });

        // NPC dim
        if (actor.type === 'NPC' && actor.gameID != null) {
            await prisma.npc.upsert({
                where: { gameId: actor.gameID },
                update: { name: actor.name },
                create: { gameId: actor.gameID, name: actor.name },
            });
        }
    }

    // Upsert abilities
    for (const ability of spine.masterData.abilities) {
        await prisma.ability.upsert({
            where: { abilityId: ability.gameID },
            update: { name: ability.name, icon: ability.icon ?? null },
            create: {
                abilityId: ability.gameID,
                name: ability.name,
                icon: ability.icon ?? null,
            },
        });
    }
}

async function countReportRows(reportCode: string): Promise<{
    fights: number;
    actors: number;
    abilities: number;
    npcs: number;
}> {
    const report = await prisma.report.findUnique({
        where: { code: reportCode },
        select: { id: true },
    });
    if (!report) return { fights: 0, actors: 0, abilities: 0, npcs: 0 };

    const [fights, actors] = await Promise.all([
        prisma.fight.count({ where: { reportId: report.id } }),
        prisma.actor.count({ where: { reportId: report.id } }),
    ]);
    const [abilities, npcs] = await Promise.all([
        prisma.ability.count(),
        prisma.npc.count(),
    ]);
    return { fights, actors, abilities, npcs };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    syncReports()
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
