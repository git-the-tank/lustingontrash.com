import { prisma } from '../db/index.js';
import { getWclClient } from '../wcl/client.js';
import { GUILD_MEMBERS_QUERY } from '../wcl/queries.js';
import { WCL_CLASS_NAMES } from '../wcl/types.js';
import type { WclGuildData } from '../wcl/types.js';
import { guildConfig } from '../../guild.config.js';

export interface PreviewCharacter {
    wclId: number;
    name: string;
    server: string;
    className: string;
    guildRank: number;
}

export interface PreviewResult {
    guild: string;
    total: number;
    filtered: number;
    characters: PreviewCharacter[];
}

async function fetchGuildMembers(): Promise<{
    wclGuild: WclGuildData['guildData']['guild'];
    included: PreviewCharacter[];
    total: number;
}> {
    const client = await getWclClient();
    const data = await client.request<WclGuildData>(GUILD_MEMBERS_QUERY, {
        id: guildConfig.wclGuildId,
    });

    const wclGuild = data.guildData.guild;
    let members = wclGuild.members.data;
    const total = members.length;

    if (guildConfig.rankFilter.length > 0) {
        members = members.filter((m) =>
            guildConfig.rankFilter.includes(m.guildRank)
        );
    }

    const included: PreviewCharacter[] = members.map((m) => ({
        wclId: m.id,
        name: m.name,
        server: m.server.name,
        className: WCL_CLASS_NAMES[m.classID] ?? 'Unknown',
        guildRank: m.guildRank,
    }));

    return { wclGuild, included, total };
}

export async function previewCharacters(): Promise<PreviewResult> {
    const { wclGuild, included, total } = await fetchGuildMembers();

    return {
        guild: wclGuild.name,
        total,
        filtered: total - included.length,
        characters: included,
    };
}

export async function syncCharacters(): Promise<{
    guild: string;
    synced: number;
    filtered: number;
    deactivated: number;
}> {
    const { wclGuild, included, total } = await fetchGuildMembers();

    const guild = await prisma.guild.upsert({
        where: { wclId: wclGuild.id },
        update: {
            name: wclGuild.name,
            server: wclGuild.server.name,
            region: wclGuild.server.region.slug,
        },
        create: {
            wclId: wclGuild.id,
            name: wclGuild.name,
            server: wclGuild.server.name,
            region: wclGuild.server.region.slug,
        },
    });

    const syncedWclIds: number[] = [];

    for (const char of included) {
        await prisma.character.upsert({
            where: { wclId: char.wclId },
            update: {
                name: char.name,
                server: char.server,
                className: char.className,
                guildRank: char.guildRank,
                active: true,
            },
            create: {
                wclId: char.wclId,
                name: char.name,
                server: char.server,
                className: char.className,
                guildRank: char.guildRank,
                active: true,
                guildId: guild.id,
            },
        });
        syncedWclIds.push(char.wclId);
    }

    // Deactivate characters no longer in the filtered roster
    const deactivated = await prisma.character.updateMany({
        where: {
            guildId: guild.id,
            active: true,
            wclId: { notIn: syncedWclIds },
        },
        data: { active: false },
    });

    return {
        guild: guild.name,
        synced: syncedWclIds.length,
        filtered: total - included.length,
        deactivated: deactivated.count,
    };
}
