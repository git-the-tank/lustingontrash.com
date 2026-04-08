import 'dotenv/config';
import { GraphQLClient, gql } from 'graphql-request';
import { guildConfig } from '@lot/shared/guild.config.js';

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const API_URL = 'https://www.warcraftlogs.com/api/v2/client';

async function main(): Promise<void> {
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.WCL_CLIENT_ID!,
            client_secret: process.env.WCL_CLIENT_SECRET!,
        }),
    });
    const { access_token } = (await response.json()) as {
        access_token: string;
    };
    const client = new GraphQLClient(API_URL, {
        headers: { authorization: `Bearer ${access_token}` },
    });

    // 1. Get the real class list from WCL
    const classQuery = gql`
        {
            gameData {
                classes {
                    id
                    name
                }
            }
        }
    `;

    console.log('--- WCL Class IDs ---');
    try {
        const classes = await client.request<{
            gameData: {
                classes: { id: number; name: string }[];
            };
        }>(classQuery);
        for (const c of classes.gameData.classes) {
            console.log(`  ${c.id}: ${c.name}`);
        }
    } catch (err) {
        console.error(
            'Class query failed:',
            err instanceof Error ? err.message : err
        );
    }
    console.log();

    // 2. Get guild members with ranks, grouped by rank
    const guildQuery = gql`
        query GuildMembers($id: Int!) {
            guildData {
                guild(id: $id) {
                    id
                    name
                    members {
                        data {
                            id
                            name
                            classID
                            guildRank
                            server {
                                name
                            }
                        }
                    }
                }
            }
        }
    `;

    const guild = await client.request<{
        guildData: {
            guild: {
                name: string;
                members: {
                    data: {
                        id: number;
                        name: string;
                        classID: number;
                        guildRank: number;
                        server: { name: string };
                    }[];
                };
            };
        };
    }>(guildQuery, { id: guildConfig.wclGuildId });

    const members = guild.guildData.guild.members.data;

    // Group by rank
    const byRank = new Map<number, typeof members>();
    for (const m of members) {
        const list = byRank.get(m.guildRank) ?? [];
        list.push(m);
        byRank.set(m.guildRank, list);
    }

    console.log(`--- ${guild.guildData.guild.name} — Members by Rank ---\n`);

    for (const [rank, chars] of [...byRank.entries()].sort(
        (a, b) => a[0] - b[0]
    )) {
        console.log(`Rank ${rank} (${chars.length} members):`);
        for (const c of chars) {
            console.log(
                `    ${c.name} — classID:${c.classID} (${c.server.name})`
            );
        }
        console.log();
    }
}

main().catch(console.error);
