import 'dotenv/config';
import { GraphQLClient, gql } from 'graphql-request';

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const API_URL = 'https://www.warcraftlogs.com/api/v2/client';

// Names to search for in WCL's zone list. Case-insensitive substring match.
// Update this list when the tier rotates. WCL bundles Midnight S1's three
// raid locations (Voidspire / Dreamrift / March on Quel'Danas) under a
// single zone "VS / DR / MQD" with all 9 encounters.
const TARGET_ZONE_NAMES = [
    'voidspire',
    'dreamrift',
    "quel'danas",
    'quel danas',
    'vs / dr / mqd',
    'vs/dr/mqd',
];

type WclZone = {
    id: number;
    name: string;
    frozen: boolean;
    expansion: { id: number; name: string };
    encounters: { id: number; name: string }[];
};

async function main(): Promise<void> {
    const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.WCL_CLIENT_ID!,
            client_secret: process.env.WCL_CLIENT_SECRET!,
        }),
    });
    if (!tokenRes.ok) {
        throw new Error(`WCL token request failed: ${tokenRes.status}`);
    }
    const { access_token } = (await tokenRes.json()) as {
        access_token: string;
    };
    const client = new GraphQLClient(API_URL, {
        headers: { authorization: `Bearer ${access_token}` },
    });

    const zonesQuery = gql`
        {
            worldData {
                zones {
                    id
                    name
                    frozen
                    expansion {
                        id
                        name
                    }
                    encounters {
                        id
                        name
                    }
                }
            }
        }
    `;

    const result = await client.request<{ worldData: { zones: WclZone[] } }>(
        zonesQuery
    );
    const zones = result.worldData.zones;

    console.log(
        `WCL returned ${zones.length} zones. Filtering for Midnight S1...`
    );
    console.log();

    const matches = zones.filter((z) =>
        TARGET_ZONE_NAMES.some((target) =>
            z.name.toLowerCase().includes(target)
        )
    );

    if (matches.length === 0) {
        console.log(
            'No matches. Dumping recent non-frozen zones for inspection:'
        );
        const recent = zones
            .filter((z) => !z.frozen)
            .sort((a, b) => b.id - a.id)
            .slice(0, 20);
        for (const z of recent) {
            console.log(
                `  zone ${z.id}: "${z.name}" (${z.expansion.name}) — ${z.encounters.length} encounters`
            );
        }
        process.exit(1);
    }

    for (const zone of matches) {
        console.log(`=== Zone ${zone.id}: "${zone.name}" ===`);
        console.log(`    expansion: ${zone.expansion.name}`);
        console.log(`    frozen: ${zone.frozen}`);
        console.log(`    encounters:`);
        for (const enc of zone.encounters) {
            console.log(`        ${enc.id}: ${enc.name}`);
        }
        console.log();
    }

    console.log('--- Paste-ready TypeScript snippet ---');
    console.log();
    console.log('export const ZONES: readonly Zone[] = [');
    for (const z of matches) {
        const key = z.name.toLowerCase().includes('voidspire')
            ? 'VOIDSPIRE'
            : z.name.toLowerCase().includes('dreamrift')
              ? 'DREAMRIFT'
              : 'QUELDANAS';
        const short =
            key === 'VOIDSPIRE' ? 'VS' : key === 'DREAMRIFT' ? 'DR' : 'MoQ';
        console.log(
            `    { key: '${key}', wclId: ${z.id}, name: '${z.name.replace(/'/g, "\\'")}', short: '${short}' },`
        );
    }
    console.log('];');
    console.log();

    console.log('export const ENCOUNTERS: readonly Encounter[] = [');
    let order = 1;
    for (const z of matches) {
        const key = z.name.toLowerCase().includes('voidspire')
            ? 'VOIDSPIRE'
            : z.name.toLowerCase().includes('dreamrift')
              ? 'DREAMRIFT'
              : 'QUELDANAS';
        for (const enc of z.encounters) {
            console.log(
                `    { id: ${enc.id}, zoneKey: '${key}', name: '${enc.name.replace(/'/g, "\\'")}', short: 'TODO', order: ${order} },`
            );
            order += 1;
        }
    }
    console.log('];');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
