import { guildConfig } from '@lot/shared/guild.config.js';
import { fetchUserWowProfile, fetchGuildRoster } from './battlenet.js';
import type { MembershipResult } from './types.js';

export async function verifyGuildMembership(
    userAccessToken: string
): Promise<MembershipResult> {
    const [profile, roster] = await Promise.all([
        fetchUserWowProfile(userAccessToken),
        fetchGuildRoster(),
    ]);

    const rosterMap = new Map(
        roster.members.map((m) => [
            `${m.character.name.toLowerCase()}-${m.character.realm.slug}`,
            m.rank,
        ])
    );

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
