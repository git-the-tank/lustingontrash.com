// Midnight Season 1 raid tier — 9 encounters.
// Released 2026-03-17.
//
// MIDNIGHT_S1_START_MS is the hard floor for report discovery watermarks.
export const MIDNIGHT_S1_START_MS = new Date('2026-03-17T15:00:00Z').getTime();
//
// WCL bundles all three in-game raid locations (The Voidspire, The Dreamrift,
// March on Quel'Danas) under a single zone: id 46, "VS / DR / MQD". The
// `raid` field below preserves the logical grouping for UI column headers.
//
// Discovered via `pnpm exec tsx scripts/wcl-discover-encounters.ts` in the
// api package. Re-run that script when the tier rotates.

export type Difficulty = 'NORMAL' | 'HEROIC' | 'MYTHIC';

export const DIFFICULTIES: readonly Difficulty[] = [
    'NORMAL',
    'HEROIC',
    'MYTHIC',
];

// WCL numeric difficulty values used by zoneRankings(difficulty: $d)
export const DIFFICULTY_WCL_ID: Record<Difficulty, number> = {
    NORMAL: 3,
    HEROIC: 4,
    MYTHIC: 5,
};

// Single WCL zone covering all Midnight S1 raid encounters.
export const MIDNIGHT_S1_ZONE_ID = 46;

export type RaidKey = 'VOIDSPIRE' | 'DREAMRIFT' | 'QUELDANAS';

export type Raid = {
    key: RaidKey;
    name: string;
    short: string;
};

export const RAIDS: readonly Raid[] = [
    { key: 'VOIDSPIRE', name: 'The Voidspire', short: 'VS' },
    { key: 'DREAMRIFT', name: 'The Dreamrift', short: 'DR' },
    { key: 'QUELDANAS', name: "March on Quel'Danas", short: 'MoQ' },
];

export type Encounter = {
    id: number; // WCL encounter ID
    raid: RaidKey;
    name: string;
    short: string; // column header abbreviation (3–5 chars)
    order: number; // display order across the whole tier
};

export const ENCOUNTERS: readonly Encounter[] = [
    // The Voidspire (6)
    {
        id: 3176,
        raid: 'VOIDSPIRE',
        name: 'Imperator Averzian',
        short: 'Avz',
        order: 1,
    },
    { id: 3177, raid: 'VOIDSPIRE', name: 'Vorasius', short: 'Vor', order: 2 },
    {
        id: 3178,
        raid: 'VOIDSPIRE',
        name: 'Vaelgor & Ezzorak',
        short: 'V+E',
        order: 3,
    },
    {
        id: 3179,
        raid: 'VOIDSPIRE',
        name: 'Fallen-King Salhadaar',
        short: 'Salh',
        order: 4,
    },
    {
        id: 3180,
        raid: 'VOIDSPIRE',
        name: 'Lightblinded Vanguard',
        short: 'LbV',
        order: 5,
    },
    {
        id: 3181,
        raid: 'VOIDSPIRE',
        name: 'Crown of the Cosmos',
        short: 'Crwn',
        order: 6,
    },
    // The Dreamrift (1)
    {
        id: 3306,
        raid: 'DREAMRIFT',
        name: 'Chimaerus, the Undreamt God',
        short: 'Chim',
        order: 7,
    },
    // March on Quel'Danas (2)
    {
        id: 3182,
        raid: 'QUELDANAS',
        name: "Belo'ren, Child of Al'ar",
        short: 'Belo',
        order: 8,
    },
    {
        id: 3183,
        raid: 'QUELDANAS',
        name: 'Midnight Falls',
        short: 'MF',
        order: 9,
    },
];

export function raidForKey(key: RaidKey): Raid {
    const raid = RAIDS.find((r) => r.key === key);
    if (!raid) throw new Error(`Unknown raid key: ${key}`);
    return raid;
}

// Quick lookup by encounter id — used by the sync job to skip unknown bosses.
export const ENCOUNTER_BY_ID: ReadonlyMap<number, Encounter> = new Map(
    ENCOUNTERS.map((e) => [e.id, e])
);
