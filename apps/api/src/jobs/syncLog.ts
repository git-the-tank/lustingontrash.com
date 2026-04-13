import { prisma } from '../db/index.js';
import type { SyncCharactersResult } from './syncCharacters.js';
import type { SyncParsesResult } from './syncParses.js';
import {
    syncCooldowns,
    SYNC_UNGATED_RANK,
    type SyncType,
} from '@lot/shared/sync.config.js';

function truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

function rosterSummary(result: SyncCharactersResult): string {
    const d = result.diff;
    const parts: string[] = [];
    if (d.added.length > 0) parts.push(`+${d.added.length} added`);
    if (d.removed.length > 0) parts.push(`-${d.removed.length} removed`);
    if (d.roleChanged.length > 0) parts.push(`${d.roleChanged.length} role`);
    if (d.classChanged.length > 0) parts.push(`${d.classChanged.length} class`);
    if (d.rankChanged.length > 0) parts.push(`${d.rankChanged.length} rank`);

    const suffix = parts.length === 0 ? 'no changes' : parts.join(' · ');
    return `${d.total} chars · ${suffix}`;
}

function parsesSummary(result: SyncParsesResult): string {
    const base = `${result.characters} chars · ${result.charactersWithData} with data · ${result.parses} parses`;
    if (result.errors.length === 0) return base;
    return `${base} · ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`;
}

export interface CooldownCheck {
    allowed: boolean;
    nextAvailableAt: Date | null;
    lastStartedAt: Date | null;
}

export async function checkSyncCooldown(
    type: SyncType,
    guildRank: number | null
): Promise<CooldownCheck> {
    if (guildRank === SYNC_UNGATED_RANK) {
        return { allowed: true, nextAvailableAt: null, lastStartedAt: null };
    }

    const last = await prisma.syncLog.findFirst({
        where: { type, status: 'SUCCESS' },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
    });

    if (!last) {
        return { allowed: true, nextAvailableAt: null, lastStartedAt: null };
    }

    const nextAvailableAt = new Date(
        last.startedAt.getTime() + syncCooldowns[type]
    );
    return {
        allowed: Date.now() >= nextAvailableAt.getTime(),
        nextAvailableAt,
        lastStartedAt: last.startedAt,
    };
}

export async function recordSync<T>(
    type: SyncType,
    run: () => Promise<T>
): Promise<T> {
    const startedAt = new Date();
    try {
        const result = await run();
        const completedAt = new Date();
        const summary =
            type === 'ROSTER'
                ? rosterSummary(result as unknown as SyncCharactersResult)
                : parsesSummary(result as unknown as SyncParsesResult);

        await prisma.syncLog.create({
            data: {
                type,
                status: 'SUCCESS',
                startedAt,
                completedAt,
                durationMs: completedAt.getTime() - startedAt.getTime(),
                summary,
                details: result as object,
            },
        });

        return result;
    } catch (err) {
        const completedAt = new Date();
        const message = err instanceof Error ? err.message : String(err);
        await prisma.syncLog.create({
            data: {
                type,
                status: 'FAILED',
                startedAt,
                completedAt,
                durationMs: completedAt.getTime() - startedAt.getTime(),
                summary: truncate(message, 200),
                error: truncate(message, 500),
            },
        });
        throw err;
    }
}
