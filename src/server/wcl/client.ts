import { GraphQLClient } from 'graphql-request';
import { getAccessToken } from './auth.js';

const WCL_API_URL = 'https://www.warcraftlogs.com/api/v2/client';

export async function getWclClient(): Promise<GraphQLClient> {
    const token = await getAccessToken();
    return new GraphQLClient(WCL_API_URL, {
        headers: { authorization: `Bearer ${token}` },
    });
}
