import 'dotenv/config';
import { GraphQLClient, gql } from 'graphql-request';
import { guildConfig } from '../src/guild.config.js';

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const API_URL = 'https://www.warcraftlogs.com/api/v2/client';

async function getToken(): Promise<string> {
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.WCL_CLIENT_ID!,
            client_secret: process.env.WCL_CLIENT_SECRET!,
        }),
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
}

async function main(): Promise<void> {
    console.log('Authenticating with WCL...');
    const token = await getToken();
    console.log('Authenticated.\n');

    const client = new GraphQLClient(API_URL, {
        headers: { authorization: `Bearer ${token}` },
    });

    // Rate limit check
    const rateLimitQuery = gql`
        {
            rateLimitData {
                pointsSpentThisHour
                limitPerHour
                pointsResetIn
            }
        }
    `;

    console.log('--- Rate Limit ---');
    const rateLimit = await client.request<{
        rateLimitData: {
            pointsSpentThisHour: number;
            limitPerHour: number;
            pointsResetIn: number;
        };
    }>(rateLimitQuery);
    console.log(rateLimit.rateLimitData);
    console.log();

    // Guild members by ID
    const guildQuery = gql`
        query GuildMembers($id: Int!) {
            guildData {
                guild(id: $id) {
                    id
                    name
                    server {
                        name
                        region {
                            slug
                        }
                    }
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

    console.log(
        `--- Guild: ${guildConfig.name} (ID: ${guildConfig.wclGuildId}) ---`
    );
    try {
        const guild = await client.request<{
            guildData: {
                guild: {
                    id: number;
                    name: string;
                    members: {
                        data: {
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
        console.log(`Guild ID: ${guild.guildData.guild.id}`);
        console.log(`Members: ${members.length}`);

        // Show rank distribution
        const ranks = new Map<number, number>();
        for (const m of members) {
            ranks.set(m.guildRank, (ranks.get(m.guildRank) ?? 0) + 1);
        }
        console.log('\nRank distribution:');
        for (const [rank, count] of [...ranks.entries()].sort(
            (a, b) => a[0] - b[0]
        )) {
            console.log(`  Rank ${rank}: ${count} members`);
        }

        console.log(
            '\nFirst 10:',
            members
                .slice(0, 10)
                .map(
                    (m) =>
                        `${m.name} (classID:${m.classID}, rank:${m.guildRank}, ${m.server.name})`
                )
        );
    } catch (err) {
        console.error(
            'Guild query failed:',
            err instanceof Error ? err.message : err
        );
    }
    console.log();

    // Recent reports
    const reportsQuery = gql`
        query GuildReports($name: String!, $server: String!, $region: String!) {
            reportData {
                reports(
                    guildName: $name
                    guildServerSlug: $server
                    guildServerRegion: $region
                    limit: 5
                ) {
                    data {
                        code
                        title
                        startTime
                        endTime
                        zone {
                            name
                        }
                    }
                }
            }
        }
    `;

    console.log('--- Recent Reports (last 5) ---');
    try {
        const reports = await client.request<{
            reportData: {
                reports: {
                    data: {
                        code: string;
                        title: string;
                        startTime: number;
                        endTime: number;
                        zone: { name: string } | null;
                    }[];
                };
            };
        }>(reportsQuery, {
            name: guildConfig.name,
            server: guildConfig.server.toLowerCase().replace(/\s+/g, '-'),
            region: guildConfig.region,
        });

        for (const r of reports.reportData.reports.data) {
            const date = new Date(r.startTime).toLocaleDateString();
            console.log(
                `  ${r.code} — ${r.title} (${r.zone?.name ?? 'unknown'}) — ${date}`
            );
        }
    } catch (err) {
        console.error(
            'Reports query failed:',
            err instanceof Error ? err.message : err
        );
    }
}

main().catch(console.error);
