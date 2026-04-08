export interface WclGuildCharacter {
    id: number;
    name: string;
    classID: number;
    guildRank: number;
    server: {
        name: string;
        slug: string;
    };
}

export interface WclGuildData {
    guildData: {
        guild: {
            id: number;
            name: string;
            server: {
                name: string;
                slug: string;
                region: {
                    slug: string;
                };
            };
            members: {
                data: WclGuildCharacter[];
            };
        };
    };
}

export interface WclTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// WCL class IDs → names (alphabetical order, NOT WoW native IDs)
export const WCL_CLASS_NAMES: Record<number, string> = {
    1: 'Death Knight',
    2: 'Druid',
    3: 'Hunter',
    4: 'Mage',
    5: 'Monk',
    6: 'Paladin',
    7: 'Priest',
    8: 'Rogue',
    9: 'Shaman',
    10: 'Warlock',
    11: 'Warrior',
    12: 'Demon Hunter',
    13: 'Evoker',
};
