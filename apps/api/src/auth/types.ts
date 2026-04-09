import type { Role } from '../generated/prisma/client.js';

export interface BattlenetTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

export interface BattlenetUserInfo {
    sub: string;
    battletag: string;
}

export interface WowCharacter {
    name: string;
    realm: {
        slug: string;
        name: string;
    };
    guild?: {
        name: string;
        realm: {
            slug: string;
        };
    };
    level: number;
    playable_class: {
        name: string;
    };
}

export interface WowProfileResponse {
    wow_accounts: Array<{
        characters: WowCharacter[];
    }>;
}

export interface GuildRosterMember {
    character: {
        name: string;
        realm: {
            slug: string;
        };
    };
    rank: number;
}

export interface GuildRosterResponse {
    members: GuildRosterMember[];
}

export interface JwtPayload {
    sub: string;
    role: Role;
    battletag: string;
}

export interface MembershipResult {
    isMember: boolean;
    isAdmin: boolean;
    guildCharacters: Array<{
        name: string;
        realmSlug: string;
        rank: number;
    }>;
}
