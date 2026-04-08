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

export async function syncCharacters(): Promise<{
    guild: string;
    synced: number;
    filtered: number;
    deactivated: number;
}> {
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

    const syncedIds: number[] = [];

    for (const char of included) {
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
    };
}
