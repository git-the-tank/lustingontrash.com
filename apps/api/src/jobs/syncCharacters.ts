import { prisma } from '../db/index.js';
import { fetchRoster } from '../wowaudit/client.js';
import type { WowauditCharacter } from '../wowaudit/client.js';
import { guildConfig } from '@lot/shared/guild.config.js';

const INCLUDED_RANKS = new Set(['Main', 'Trial']);

export interface PreviewCharacter {
    wowauditId: number;
    name: string;
    server: string;
    className: string;
    role: string;
    rank: string;
}

export interface PreviewResult {
    guild: string;
    total: number;
    filtered: number;
    characters: PreviewCharacter[];
}

export interface RosterDiffCharacter {
    name: string;
    className: string;
    role: string;
    rank: string;
}

export interface RosterDiffChange {
    name: string;
    from: string;
    to: string;
}

export interface RosterDiff {
    total: number;
    added: RosterDiffCharacter[];
    removed: RosterDiffCharacter[];
    roleChanged: RosterDiffChange[];
    classChanged: RosterDiffChange[];
    rankChanged: RosterDiffChange[];
}

export interface SyncCharactersResult {
    guild: string;
    synced: number;
    filtered: number;
    deactivated: number;
    diff: RosterDiff;
}

function toPreview(char: WowauditCharacter): PreviewCharacter {
    return {
        wowauditId: char.id,
        name: char.name,
        server: char.realm,
        className: char.class,
        role: char.role,
        rank: char.rank,
    };
}

function filterRoster(roster: WowauditCharacter[]): {
    included: WowauditCharacter[];
    total: number;
} {
    const tracking = roster.filter((c) => c.status === 'tracking');
    const included = tracking.filter((c) => INCLUDED_RANKS.has(c.rank));
    return { included, total: tracking.length };
}

export async function previewCharacters(): Promise<PreviewResult> {
    const roster = await fetchRoster();
    const { included, total } = filterRoster(roster);

    return {
        guild: guildConfig.name,
        total,
        filtered: total - included.length,
        characters: included.map(toPreview),
    };
}

export async function syncCharacters(): Promise<SyncCharactersResult> {
    const roster = await fetchRoster();
    const { included, total } = filterRoster(roster);

    const guild = await prisma.guild.upsert({
        where: { wclId: guildConfig.wclGuildId },
        update: {
            name: guildConfig.name,
            server: guildConfig.server,
            region: guildConfig.region,
        },
        create: {
            wclId: guildConfig.wclGuildId,
            name: guildConfig.name,
            server: guildConfig.server,
            region: guildConfig.region,
        },
    });

    const existing = await prisma.character.findMany({
        where: { guildId: guild.id },
        select: {
            wowauditId: true,
            name: true,
            className: true,
            role: true,
            rank: true,
            active: true,
        },
    });
    const prevByWowauditId = new Map(existing.map((c) => [c.wowauditId, c]));

    const diff: RosterDiff = {
        total: included.length,
        added: [],
        removed: [],
        roleChanged: [],
        classChanged: [],
        rankChanged: [],
    };

    const syncedIds: number[] = [];

    for (const char of included) {
        const prev = prevByWowauditId.get(char.id);
        if (!prev || prev.active === false) {
            diff.added.push({
                name: char.name,
                className: char.class,
                role: char.role,
                rank: char.rank,
            });
        } else {
            if (prev.role !== char.role) {
                diff.roleChanged.push({
                    name: char.name,
                    from: prev.role,
                    to: char.role,
                });
            }
            if (prev.className !== char.class) {
                diff.classChanged.push({
                    name: char.name,
                    from: prev.className,
                    to: char.class,
                });
            }
            if (prev.rank !== char.rank) {
                diff.rankChanged.push({
                    name: char.name,
                    from: prev.rank,
                    to: char.rank,
                });
            }
        }

        await prisma.character.upsert({
            where: { wowauditId: char.id },
            update: {
                name: char.name,
                server: char.realm,
                className: char.class,
                role: char.role,
                rank: char.rank,
                active: true,
            },
            create: {
                wowauditId: char.id,
                name: char.name,
                server: char.realm,
                className: char.class,
                role: char.role,
                rank: char.rank,
                active: true,
                guildId: guild.id,
            },
        });
        syncedIds.push(char.id);
    }

    const syncedIdSet = new Set(syncedIds);
    for (const prev of existing) {
        if (prev.active && !syncedIdSet.has(prev.wowauditId)) {
            diff.removed.push({
                name: prev.name,
                className: prev.className,
                role: prev.role,
                rank: prev.rank,
            });
        }
    }

    const deactivated = await prisma.character.updateMany({
        where: {
            guildId: guild.id,
            active: true,
            wowauditId: { notIn: syncedIds },
        },
        data: { active: false },
    });

    return {
        guild: guild.name,
        synced: syncedIds.length,
        filtered: total - included.length,
        deactivated: deactivated.count,
        diff,
    };
}
