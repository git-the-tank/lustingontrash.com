import { guildConfig } from '@lot/shared/guild.config.js';
import { fetchUserWowProfile, fetchGuildRoster } from './battlenet.js';
import type { GuildRosterResponse, MembershipResult } from './types.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cachedRoster: GuildRosterResponse | null = null;
let cachedRosterAt = 0;

async function getCachedRoster(): Promise<GuildRosterResponse> {
    if (cachedRoster && Date.now() - cachedRosterAt < ONE_DAY_MS) {
        return cachedRoster;
    }

    cachedRoster = await fetchGuildRoster();
    cachedRosterAt = Date.now();
    return cachedRoster;
}

function buildRosterMap(roster: GuildRosterResponse): Map<string, number> {
    return new Map(
        roster.members.map((m) => [
            `${m.character.name.toLowerCase()}-${m.character.realm.slug}`,
            m.rank,
        ])
    );
}

export async function verifyGuildMembership(
    userAccessToken: string
): Promise<MembershipResult> {
    const [profile, roster] = await Promise.all([
        fetchUserWowProfile(userAccessToken),
        getCachedRoster(),
    ]);

    const rosterMap = buildRosterMap(roster);
    const guildCharacters: MembershipResult['guildCharacters'] = [];

    for (const account of profile.wow_accounts) {
        for (const char of account.characters) {
            const key = `${char.name.toLowerCase()}-${char.realm.slug}`;
            const rank = rosterMap.get(key);

            if (rank !== undefined) {
                guildCharacters.push({
                    name: char.name,
                    realmSlug: char.realm.slug,
                    rank,
                });
            }
        }
    }

    const isAdmin = guildCharacters.some((c) =>
        guildConfig.adminRanks.includes(c.rank)
    );

    return {
        isMember: guildCharacters.length > 0,
        isAdmin,
        guildCharacters,
    };
}

function slugifyServer(server: string): string {
    return server.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
}

/**
 * Check if any of the given characters are still in the guild roster,
 * and return the resolved role. Uses the 1-day cached roster.
 */
export async function checkMembershipByCharacters(
    characters: Array<{ name: string; server: string }>
): Promise<{ isMember: boolean; isAdmin: boolean }> {
    const roster = await getCachedRoster();
    const rosterMap = buildRosterMap(roster);

    let isMember = false;
    let isAdmin = false;

    for (const char of characters) {
        const key = `${char.name.toLowerCase()}-${slugifyServer(char.server)}`;
        const rank = rosterMap.get(key);

        if (rank !== undefined) {
            isMember = true;
            if (guildConfig.adminRanks.includes(rank)) {
                isAdmin = true;
            }
        }
    }

    return { isMember, isAdmin };
}
