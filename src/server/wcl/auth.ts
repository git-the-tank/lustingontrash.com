import type { WclTokenResponse } from './types.js';

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAccessToken(): Promise<string> {
    const now = Date.now();

    if (cachedToken && now < tokenExpiresAt - 60_000) {
        return cachedToken;
    }

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            'WCL_CLIENT_ID and WCL_CLIENT_SECRET must be set in environment'
        );
    }

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!response.ok) {
        throw new Error(
            `WCL auth failed: ${response.status} ${response.statusText}`
        );
    }

    const data = (await response.json()) as WclTokenResponse;
    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000;

    return cachedToken;
}
