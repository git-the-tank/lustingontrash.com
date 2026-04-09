import { guildConfig } from '@lot/shared/guild.config.js';
import type {
    BattlenetTokenResponse,
    BattlenetUserInfo,
    GuildRosterResponse,
    WowProfileResponse,
} from './types.js';

const AUTHORIZE_URL = 'https://oauth.battle.net/authorize';
const TOKEN_URL = 'https://oauth.battle.net/token';
const USERINFO_URL = 'https://oauth.battle.net/userinfo';
const API_BASE = `https://${guildConfig.region}.api.blizzard.com`;

let cachedClientToken: string | null = null;
let clientTokenExpiresAt = 0;

function getCredentials(): { clientId: string; clientSecret: string } {
    const clientId = process.env.BNET_CLIENT_ID;
    const clientSecret = process.env.BNET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            'BNET_CLIENT_ID and BNET_CLIENT_SECRET must be set in environment'
        );
    }

    return { clientId, clientSecret };
}

export function getBattlenetAuthUrl(state: string): string {
    const { clientId } = getCredentials();
    const redirectUri = `${process.env.API_URL}/api/auth/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid wow.profile',
        state,
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(
    code: string
): Promise<BattlenetTokenResponse> {
    const { clientId, clientSecret } = getCredentials();
    const redirectUri = `${process.env.API_URL}/api/auth/callback`;

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Battle.net token exchange failed: ${response.status} ${response.statusText}`
        );
    }

    return (await response.json()) as BattlenetTokenResponse;
}

export async function fetchUserInfo(
    accessToken: string
): Promise<BattlenetUserInfo> {
    const response = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error(
            `Battle.net userinfo failed: ${response.status} ${response.statusText}`
        );
    }

    return (await response.json()) as BattlenetUserInfo;
}

export async function fetchUserWowProfile(
    accessToken: string
): Promise<WowProfileResponse> {
    const response = await fetch(
        `${API_BASE}/profile/user/wow?namespace=profile-${guildConfig.region}&locale=en_US`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!response.ok) {
        throw new Error(
            `WoW profile fetch failed: ${response.status} ${response.statusText}`
        );
    }

    return (await response.json()) as WowProfileResponse;
}

async function getClientToken(): Promise<string> {
    const now = Date.now();

    if (cachedClientToken && now < clientTokenExpiresAt - 60_000) {
        return cachedClientToken;
    }

    const { clientId, clientSecret } = getCredentials();

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });

    if (!response.ok) {
        throw new Error(
            `Battle.net client credentials failed: ${response.status} ${response.statusText}`
        );
    }

    const data = (await response.json()) as BattlenetTokenResponse;
    cachedClientToken = data.access_token;
    clientTokenExpiresAt = now + data.expires_in * 1000;

    return cachedClientToken;
}

export async function fetchGuildRoster(): Promise<GuildRosterResponse> {
    const token = await getClientToken();
    const guildSlug = guildConfig.name.toLowerCase().replace(/\s+/g, '-');

    const response = await fetch(
        `${API_BASE}/data/wow/guild/${guildConfig.realmSlug}/${guildSlug}/roster?namespace=profile-${guildConfig.region}&locale=en_US`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (!response.ok) {
        throw new Error(
            `Guild roster fetch failed: ${response.status} ${response.statusText}`
        );
    }

    return (await response.json()) as GuildRosterResponse;
}
