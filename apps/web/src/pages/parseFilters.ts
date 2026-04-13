import type { Difficulty } from '@lot/shared/encounters.config.js';

// ---- Types ----
export type RoleKey = 'Tank' | 'Heal' | 'Melee' | 'Ranged';
export const ROLE_KEYS: readonly RoleKey[] = [
    'Tank',
    'Heal',
    'Melee',
    'Ranged',
];
export const ROLE_LABEL: Record<RoleKey, string> = {
    Tank: 'Tank',
    Heal: 'Healer',
    Melee: 'Melee',
    Ranged: 'Ranged',
};

export const DIFFICULTY_DISPLAY_ORDER: Difficulty[] = [
    'MYTHIC',
    'HEROIC',
    'NORMAL',
];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
    MYTHIC: 'Mythic',
    HEROIC: 'Heroic',
    NORMAL: 'Normal',
};

// ---- Defaults ----
export const DEFAULT_DIFFICULTIES = new Set<Difficulty>(['MYTHIC', 'HEROIC']);
// Roles and categories default to empty: no filter applied, every pill reads
// as inactive. Selecting a subset narrows the view.
export const DEFAULT_ROLES = new Set<RoleKey>();
export const DEFAULT_SORT_KEY = 'avg';
export const DEFAULT_SORT_DIR: 'asc' | 'desc' = 'desc';
export const DEFAULT_LP_HIDDEN = true;
export const LP_THRESHOLD = 15;

// ---- Difficulty encode/decode ----
const DIFF_CHAR: Record<Difficulty, string> = {
    MYTHIC: 'm',
    HEROIC: 'h',
    NORMAL: 'n',
};
const CHAR_DIFF: Record<string, Difficulty> = {
    m: 'MYTHIC',
    h: 'HEROIC',
    n: 'NORMAL',
};

export function encodeDifficulties(set: Set<Difficulty>): string {
    return DIFFICULTY_DISPLAY_ORDER.filter((d) => set.has(d))
        .map((d) => DIFF_CHAR[d])
        .join('');
}
export function decodeDifficulties(str: string): Set<Difficulty> {
    return new Set(
        str
            .split('')
            .map((c) => CHAR_DIFF[c])
            .filter(Boolean)
    );
}
const DEFAULT_DIFF_STR = encodeDifficulties(DEFAULT_DIFFICULTIES);

// ---- Role encode/decode ----
const ROLE_CHAR: Record<RoleKey, string> = {
    Tank: 't',
    Heal: 'l',
    Melee: 'm',
    Ranged: 'r',
};
const CHAR_ROLE: Record<string, RoleKey> = {
    t: 'Tank',
    l: 'Heal',
    m: 'Melee',
    r: 'Ranged',
};

export function encodeRoles(set: Set<RoleKey>): string {
    return ROLE_KEYS.filter((r) => set.has(r))
        .map((r) => ROLE_CHAR[r])
        .join('');
}
export function decodeRoles(str: string): Set<RoleKey> {
    return new Set(
        str
            .split('')
            .map((c) => CHAR_ROLE[c])
            .filter(Boolean)
    );
}

// ---- Encounter encode/decode ----
// Encounters are identified by their order number. Dot-separated to
// handle multi-digit orders (e.g., "1.3.10"). When all are selected
// (default), the param is omitted entirely.
export function encodeEncounters(
    set: Set<number>,
    allOrders: number[]
): string | null {
    if (allOrders.every((o) => set.has(o))) return null; // default
    return allOrders.filter((o) => set.has(o)).join('.');
}
export function decodeEncounters(
    str: string | null,
    allOrders: number[]
): Set<number> {
    if (!str) return new Set(allOrders);
    return new Set(
        str
            .split('.')
            .map(Number)
            .filter((n) => !Number.isNaN(n))
    );
}

// ---- Sort encode/decode ----
export function encodeSort(key: string, dir: 'asc' | 'desc'): string | null {
    const prefix = dir === 'desc' ? '-' : '+';
    const encoded = `${prefix}${key}`;
    if (key === DEFAULT_SORT_KEY && dir === DEFAULT_SORT_DIR) return null;
    return encoded;
}
export function decodeSort(str: string | null): {
    key: string;
    dir: 'asc' | 'desc';
} {
    if (!str) return { key: DEFAULT_SORT_KEY, dir: DEFAULT_SORT_DIR };
    const dir = str.startsWith('+') ? 'asc' : 'desc';
    const key = str.replace(/^[+-]/, '');
    return { key: key || DEFAULT_SORT_KEY, dir };
}

// ---- Category encode/decode ----
export type CategoryKey = 'prog' | 'farm';
export const CATEGORY_KEYS: readonly CategoryKey[] = ['prog', 'farm'];
export const CATEGORY_LABEL: Record<CategoryKey, string> = {
    prog: 'Prog',
    farm: 'Farm',
};

const CAT_CHAR: Record<CategoryKey, string> = { prog: 'p', farm: 'f' };
const CHAR_CAT: Record<string, CategoryKey> = { p: 'prog', f: 'farm' };

export function encodeCategories(set: Set<CategoryKey>): string {
    return CATEGORY_KEYS.filter((k) => set.has(k))
        .map((k) => CAT_CHAR[k])
        .join('');
}
export function decodeCategories(str: string | null): Set<CategoryKey> {
    if (!str) return new Set();
    return new Set(
        str
            .split('')
            .map((c) => CHAR_CAT[c])
            .filter(Boolean)
    );
}

// ---- Helpers for reading/writing hash params ----
export function readFiltersFromHash(
    params: URLSearchParams,
    allEncounterOrders: number[]
): {
    difficulties: Set<Difficulty>;
    roles: Set<RoleKey>;
    categories: Set<CategoryKey>;
    encounters: Set<number>;
    sortKey: string;
    sortDir: 'asc' | 'desc';
    hideLowParticipation: boolean;
} {
    const difficulties = params.has('d')
        ? decodeDifficulties(params.get('d')!)
        : new Set(DEFAULT_DIFFICULTIES);
    const roles = params.has('r')
        ? decodeRoles(params.get('r')!)
        : new Set(DEFAULT_ROLES);
    const categories = decodeCategories(params.get('cat'));
    const encounters = decodeEncounters(params.get('e'), allEncounterOrders);
    const { key: sortKey, dir: sortDir } = decodeSort(params.get('s'));
    const hideLowParticipation = params.get('lp') !== '0';

    return {
        difficulties,
        roles,
        categories,
        encounters,
        sortKey,
        sortDir,
        hideLowParticipation,
    };
}

export function setOrDelete(
    p: URLSearchParams,
    key: string,
    value: string | null,
    defaultValue: string | null
): void {
    if (value === null || value === defaultValue) {
        p.delete(key);
    } else {
        p.set(key, value);
    }
}

// ---- Class filter encode/decode ----
// Single class name, URL-safe via encodeURIComponent.
export function encodeClass(className: string | null): string | null {
    if (!className) return null;
    return className;
}
export function decodeClass(str: string | null): string | null {
    if (!str) return null;
    return str;
}

// ---- Build parseboard URL ----
// Narrowed to a single category ('prog' or 'farm'); pass undefined for
// "show all". 'overall' is no longer a distinct bucket — empty selection
// means every fight is shown.
export type CategoryParam = CategoryKey;

export function buildParseboardUrl(options: {
    category?: CategoryParam;
    roles?: Set<RoleKey>;
    className?: string;
}): string {
    const params = new URLSearchParams();

    if (options.category) {
        params.set('cat', CAT_CHAR[options.category]);
    }

    if (options.roles && options.roles.size > 0) {
        params.set('r', encodeRoles(options.roles));
    }

    if (options.className) {
        params.set('c', options.className);
    }

    const hash = params.toString();
    return hash ? `/parses#${hash}` : '/parses';
}

export { DEFAULT_DIFF_STR };
