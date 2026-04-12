import { useMemo, useCallback, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useHashParams } from '../hooks/useHashParams';
import { CLASS_COLORS, classIconUrl } from '../lib/classColors';
import { WOW_QUALITY } from '../lib/colorSchemes/wowQuality';
import { FilterPillGroup } from '../components/ranking/FilterPillGroup';
import { FilterPill } from '../components/ranking/FilterPill';
import { SortHeader } from '../components/ranking/SortHeader';
import { MetricCell } from '../components/ranking/MetricCell';
import {
    DIFFICULTY_WCL_ID,
    type Difficulty,
    type Encounter,
    type Raid,
} from '@lot/shared/encounters.config.js';
import {
    DIFFICULTY_DISPLAY_ORDER,
    DIFFICULTY_LABEL,
    ROLE_KEYS,
    ROLE_LABEL,
    LP_THRESHOLD,
    DEFAULT_ROLE_STR,
    readFiltersFromHash,
    encodeRoles,
    encodeSort,
    decodeClass,
    setOrDelete,
    type RoleKey,
} from './parseFilters';

// ---- API response types ----
type Metric = 'dps' | 'hps';

interface ParseData {
    encounterId: number;
    difficulty: Difficulty;
    metric: Metric;
    bestPercent: number;
    medianPercent: number | null;
    bestAmount: number | null;
    bestSpec: string | null;
    fastestKillMs: number | null;
    killCount: number;
}

interface CharacterData {
    id: string;
    name: string;
    server: string;
    className: string;
    role: string;
}

interface ParseRow {
    character: CharacterData;
    parses: ParseData[];
}

interface ParsesResponse {
    zoneId: number;
    difficulties: Difficulty[];
    raids: Raid[];
    encounters: Encounter[];
    rows: ParseRow[];
}

// ---- Formatters ----
function formatPercentile(value: number): string {
    return Math.round(value).toString();
}

function formatCompact(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return Math.round(value).toString();
}

function formatDuration(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function slugifyServer(server: string): string {
    return server.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
}

const WCL_REGION = 'us';

function wclLink(
    character: CharacterData,
    zoneId: number,
    parse: ParseData
): string {
    const slug = slugifyServer(character.server);
    const diffNum = DIFFICULTY_WCL_ID[parse.difficulty];
    return `https://www.warcraftlogs.com/character/${WCL_REGION}/${slug}/${encodeURIComponent(
        character.name
    )}#zone=${encodeURIComponent(String(zoneId))}&boss=${encodeURIComponent(String(parse.encounterId))}&difficulty=${encodeURIComponent(String(diffNum))}&metric=${encodeURIComponent(parse.metric)}`;
}

// ---- Tooltip ----
function ParseTooltip({
    encounter,
    difficulty,
    parse,
    character,
    zoneId,
}: {
    encounter: Encounter;
    difficulty: Difficulty;
    parse: ParseData;
    character: CharacterData;
    zoneId: number;
}): ReactElement {
    const metricLabel = parse.metric.toUpperCase();
    return (
        <div className="space-y-1.5 text-left">
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-amber-200">
                    {encounter.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">
                    {DIFFICULTY_LABEL[difficulty]}
                </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-gray-800 pt-1.5">
                <span className="text-gray-500">{metricLabel}</span>
                <span className="font-mono font-semibold tabular-nums">
                    {formatPercentile(parse.bestPercent)}th%
                </span>
            </div>
            {parse.bestSpec && <Row label="Spec" value={parse.bestSpec} />}
            {parse.bestAmount != null && (
                <Row
                    label="Best"
                    value={`${formatCompact(parse.bestAmount)} ${metricLabel}`}
                />
            )}
            {parse.medianPercent != null && (
                <Row
                    label="Median"
                    value={`${formatPercentile(parse.medianPercent)}th%`}
                />
            )}
            {parse.fastestKillMs != null && parse.fastestKillMs > 0 && (
                <Row
                    label="Fastest"
                    value={formatDuration(parse.fastestKillMs)}
                />
            )}
            <Row label="Kills" value={parse.killCount.toString()} />
            <div className="mt-1.5 border-t border-gray-800 pt-1.5 text-center">
                <a
                    href={wclLink(character, zoneId, parse)}
                    target="_blank"
                    rel="noreferrer"
                    className="pointer-events-auto text-[11px] text-amber-400 hover:text-amber-300 hover:underline"
                >
                    Open on Warcraft Logs ↗
                </a>
            </div>
        </div>
    );
}

function Row({
    label,
    value,
}: {
    label: string;
    value: ReactNode;
}): ReactElement {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-200">{value}</span>
        </div>
    );
}

// ---- Derived row ----
interface DerivedRow {
    character: CharacterData;
    parseByKey: Map<string, ParseData>;
    avgPercentile: number | null;
    parsedCount: number;
}

function cellKey(encounterId: number, difficulty: Difficulty): string {
    return `${encounterId}-${difficulty}`;
}

function normalizeRole(role: string): RoleKey | null {
    const normalized = role.trim();
    if (ROLE_KEYS.includes(normalized as RoleKey)) return normalized as RoleKey;
    return null;
}

function difficultyBandColor(difficulty: Difficulty): string {
    if (difficulty === 'MYTHIC') return 'bg-amber-950/40 text-amber-300';
    if (difficulty === 'HEROIC') return 'bg-purple-950/40 text-purple-300';
    return 'bg-blue-950/40 text-blue-300';
}

// ---- Fight config types ----
type FightCategory = 'PROGRESSION' | 'FARM' | 'IGNORED';
type CategoryFilter = 'all' | 'prog' | 'overall' | 'farm';

interface FightConfigResponse {
    configs: Array<{
        encounterId: number;
        difficulty: Difficulty;
        category: FightCategory;
    }>;
}

function configKey(encounterId: number, difficulty: string): string {
    return `${encounterId}:${difficulty}`;
}

// ---- Main component ----
export function Parses(): ReactElement {
    const { data, isLoading, error } = useApi<ParsesResponse>('/parses');
    const { data: fightConfigData } =
        useApi<FightConfigResponse>('/fight-config');
    const [hashParams, updateHash] = useHashParams();

    const categoryFilter = useMemo((): CategoryFilter => {
        const val = hashParams.get('cat');
        if (val === 'prog' || val === 'overall' || val === 'farm') return val;
        return 'all';
    }, [hashParams]);

    const setCategoryFilter = useCallback(
        (cat: CategoryFilter) => {
            updateHash((p) => {
                if (cat === 'all') {
                    p.delete('cat');
                } else {
                    p.set('cat', cat);
                }
            });
        },
        [updateHash]
    );

    // All encounter orders (for decode default)
    const allEncounterOrders = useMemo(
        () => (data ? data.encounters.map((e) => e.order) : []),
        [data]
    );

    // Derive filter state from URL hash
    const filters = useMemo(
        () => readFiltersFromHash(hashParams, allEncounterOrders),
        [hashParams, allEncounterOrders]
    );

    const classFilter = useMemo(
        () => decodeClass(hashParams.get('c')),
        [hashParams]
    );

    // ---- Filter setters (update hash) ----
    const toggleRole = useCallback(
        (role: RoleKey) => {
            updateHash((p) => {
                const current = new Set(filters.roles);
                if (current.has(role)) current.delete(role);
                else current.add(role);
                setOrDelete(p, 'r', encodeRoles(current), DEFAULT_ROLE_STR);
            });
        },
        [filters.roles, updateHash]
    );

    const handleSort = useCallback(
        (key: string, defaultDir: 'asc' | 'desc' = 'desc') => {
            updateHash((p) => {
                let newDir: 'asc' | 'desc';
                if (filters.sortKey === key) {
                    newDir = filters.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    newDir = defaultDir;
                }
                setOrDelete(p, 's', encodeSort(key, newDir), null);
            });
        },
        [filters.sortKey, filters.sortDir, updateHash]
    );

    // ---- Data derivation ----
    const derived = useMemo(() => {
        if (!data) return null;

        const encounters = [...data.encounters].sort(
            (a, b) => a.order - b.order
        );

        // Filter rows by role and optional class filter
        const filteredRows = data.rows.filter((r) => {
            const normalized = normalizeRole(r.character.role);
            if (!normalized || !filters.roles.has(normalized)) return false;
            if (classFilter && r.character.className !== classFilter)
                return false;
            return true;
        });

        // Count participation per (encounter, difficulty) across the
        // FULL guild roster, not the filtered view. This prevents columns
        // from disappearing when filtering by class or role.
        const participationCount = new Map<string, number>();
        for (const row of data.rows) {
            for (const parse of row.parses) {
                const key = cellKey(parse.encounterId, parse.difficulty);
                participationCount.set(
                    key,
                    (participationCount.get(key) ?? 0) + 1
                );
            }
        }

        // Build fight config lookup
        const fightConfigMap = new Map<string, FightCategory>();
        if (fightConfigData) {
            for (const c of fightConfigData.configs) {
                fightConfigMap.set(
                    configKey(c.encounterId, c.difficulty),
                    c.category
                );
            }
        }

        // Build visible columns
        const visibleColumns: {
            encounter: Encounter;
            difficulty: Difficulty;
        }[] = [];
        for (const difficulty of DIFFICULTY_DISPLAY_ORDER) {
            if (!filters.difficulties.has(difficulty)) continue;
            for (const encounter of encounters) {
                if (!filters.encounters.has(encounter.order)) continue;
                // Category filter
                if (categoryFilter !== 'all') {
                    const cat =
                        fightConfigMap.get(
                            configKey(encounter.id, difficulty)
                        ) ?? 'IGNORED';
                    if (categoryFilter === 'prog' && cat !== 'PROGRESSION')
                        continue;
                    if (
                        categoryFilter === 'overall' &&
                        cat !== 'PROGRESSION' &&
                        cat !== 'FARM'
                    )
                        continue;
                    if (categoryFilter === 'farm' && cat !== 'FARM') continue;
                }
                const count =
                    participationCount.get(cellKey(encounter.id, difficulty)) ??
                    0;
                if (filters.hideLowParticipation && count < LP_THRESHOLD) {
                    continue;
                }
                visibleColumns.push({ encounter, difficulty });
            }
        }

        // Build rows with parse lookup + avg
        const rows: DerivedRow[] = filteredRows.map((r) => {
            const parseByKey = new Map<string, ParseData>();
            for (const p of r.parses) {
                parseByKey.set(cellKey(p.encounterId, p.difficulty), p);
            }

            let sum = 0;
            let kills = 0;
            for (const { encounter, difficulty } of visibleColumns) {
                const parse = parseByKey.get(cellKey(encounter.id, difficulty));
                if (parse) {
                    sum += parse.bestPercent;
                    kills += 1;
                }
            }
            const avgPercentile = kills > 0 ? sum / kills : null;

            return {
                character: r.character,
                parseByKey,
                avgPercentile,
                parsedCount: kills,
            };
        });

        // Count columns hidden by LP filter (for badge)
        let lpHiddenCount = 0;
        if (filters.hideLowParticipation) {
            for (const difficulty of DIFFICULTY_DISPLAY_ORDER) {
                if (!filters.difficulties.has(difficulty)) continue;
                for (const encounter of encounters) {
                    if (!filters.encounters.has(encounter.order)) continue;
                    const count =
                        participationCount.get(
                            cellKey(encounter.id, difficulty)
                        ) ?? 0;
                    if (count < LP_THRESHOLD) lpHiddenCount += 1;
                }
            }
        }

        return { encounters, visibleColumns, rows, lpHiddenCount };
    }, [data, filters, classFilter, categoryFilter, fightConfigData]);

    // ---- Sort ----
    const sortedRows = useMemo(() => {
        if (!derived) return [];
        const { rows } = derived;
        const { sortKey, sortDir } = filters;
        const dirFactor = sortDir === 'desc' ? -1 : 1;

        return [...rows].sort((a, b) => {
            if (sortKey === 'name') {
                return (
                    dirFactor *
                    a.character.name.localeCompare(
                        b.character.name,
                        undefined,
                        { sensitivity: 'base' }
                    )
                );
            }
            if (sortKey === 'avg') {
                if (a.avgPercentile == null && b.avgPercentile == null)
                    return 0;
                if (a.avgPercentile == null) return 1;
                if (b.avgPercentile == null) return -1;
                const primary = dirFactor * (a.avgPercentile - b.avgPercentile);
                if (primary !== 0) return primary;
                return b.parsedCount - a.parsedCount;
            }
            // Column sort: "col:<encounterId>:<difficulty>"
            if (sortKey.startsWith('col:')) {
                const [, idStr, diff] = sortKey.split(':');
                const id = Number(idStr);
                const aParse = a.parseByKey.get(
                    cellKey(id, diff as Difficulty)
                );
                const bParse = b.parseByKey.get(
                    cellKey(id, diff as Difficulty)
                );
                if (aParse == null && bParse == null) return 0;
                if (aParse == null) return 1;
                if (bParse == null) return -1;
                return dirFactor * (aParse.bestPercent - bParse.bestPercent);
            }
            return 0;
        });
    }, [derived, filters]);

    // ---- Render ----
    if (isLoading) {
        return (
            <div className="flex items-center gap-3 py-20 text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-amber-500" />
                Loading parses...
            </div>
        );
    }

    if (error) {
        return <p className="py-20 text-red-400">{error}</p>;
    }

    if (!data || !derived) {
        return (
            <div className="py-20 text-gray-500">
                <p>No parse data yet.</p>
                <p className="mt-2 text-sm">
                    Run <code>pnpm run db:sync:parses</code> to ingest.
                </p>
            </div>
        );
    }

    const { visibleColumns, rows } = derived;

    // Difficulty group spans for header
    const difficultyGroups = DIFFICULTY_DISPLAY_ORDER.filter((d) =>
        filters.difficulties.has(d)
    )
        .map((d) => ({
            difficulty: d,
            count: visibleColumns.filter((c) => c.difficulty === d).length,
        }))
        .filter((g) => g.count > 0);

    return (
        <div>
            <div className="mb-6 flex items-baseline gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-amber-100">
                    Parses
                </h1>
                <span className="text-sm text-gray-500">
                    Midnight S1 · {rows.length}
                    {rows.length !== data.rows.length
                        ? `/${data.rows.length}`
                        : ''}{' '}
                    raiders
                </span>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-xs text-gray-500">Category</span>
                    {(
                        [
                            { key: 'prog', label: 'Prog' },
                            { key: 'overall', label: 'Overall' },
                            { key: 'farm', label: 'Farm' },
                            { key: 'all', label: 'All' },
                        ] as const
                    ).map((opt) => (
                        <FilterPill
                            key={opt.key}
                            label={opt.label}
                            active={categoryFilter === opt.key}
                            onClick={() => setCategoryFilter(opt.key)}
                        />
                    ))}
                </div>
                <FilterPillGroup<RoleKey>
                    label="Role"
                    values={ROLE_KEYS}
                    selected={filters.roles}
                    onToggle={toggleRole}
                    renderLabel={(r) => ROLE_LABEL[r]}
                />
                {classFilter && (
                    <FilterPill
                        label={`Class: ${classFilter} ✕`}
                        active={true}
                        onClick={() =>
                            updateHash((p) => {
                                p.delete('c');
                            })
                        }
                        title="Clear class filter"
                    />
                )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/80 shadow-xl shadow-black/30">
                <table className="w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                        {/* Group row: difficulty bands */}
                        <tr className="bg-gray-900">
                            {/* Rank + Player + Avg span */}
                            <th
                                colSpan={3}
                                className="sticky left-0 z-10 bg-gray-900 px-4 py-2"
                            >
                                &nbsp;
                            </th>
                            {difficultyGroups.map((g) => (
                                <th
                                    key={g.difficulty}
                                    colSpan={g.count}
                                    className={`border-b border-gray-800 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider ${difficultyBandColor(
                                        g.difficulty
                                    )}`}
                                >
                                    {DIFFICULTY_LABEL[g.difficulty]}
                                </th>
                            ))}
                        </tr>
                        {/* Column header row */}
                        <tr className="border-b border-gray-700/60 bg-gray-900">
                            <th className="sticky left-0 z-10 w-10 bg-gray-900 py-3 pl-4 pr-1 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                #
                            </th>
                            <th className="sticky left-10 z-10 bg-gray-900 py-3 pl-2 pr-3">
                                <SortHeader
                                    label="Player"
                                    sortKey="name"
                                    currentSort={filters.sortKey}
                                    currentDir={filters.sortDir}
                                    onSort={(k) => handleSort(k, 'asc')}
                                />
                            </th>
                            <th className="px-2 py-2 text-center">
                                <SortHeader
                                    label="Avg"
                                    sortKey="avg"
                                    currentSort={filters.sortKey}
                                    currentDir={filters.sortDir}
                                    onSort={(k) => handleSort(k, 'desc')}
                                    align="center"
                                />
                            </th>
                            {visibleColumns.map(({ encounter, difficulty }) => {
                                const key = `col:${encounter.id}:${difficulty}`;
                                return (
                                    <th
                                        key={key}
                                        className="px-1 py-2 text-center"
                                        title={`${encounter.name} — ${DIFFICULTY_LABEL[difficulty]}`}
                                    >
                                        <SortHeader
                                            label={encounter.short}
                                            sortKey={key}
                                            currentSort={filters.sortKey}
                                            currentDir={filters.sortDir}
                                            onSort={(k) =>
                                                handleSort(k, 'desc')
                                            }
                                            align="center"
                                        />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map((row, i) => (
                            <tr
                                key={row.character.id}
                                className={`transition-colors hover:bg-gray-800/40 ${
                                    i % 2 === 0
                                        ? 'bg-gray-900/30'
                                        : 'bg-gray-950/30'
                                }`}
                            >
                                {/* Rank */}
                                <td className="sticky left-0 z-10 border-b border-gray-800/50 bg-[inherit] py-2 pl-4 pr-1 text-center font-mono text-xs tabular-nums text-gray-600">
                                    {i + 1}
                                </td>
                                {/* Player */}
                                <td className="sticky left-10 z-10 border-b border-gray-800/50 bg-[inherit] py-2 pl-2 pr-3">
                                    <Link
                                        to={`/character/${encodeURIComponent(row.character.name)}`}
                                        className="flex items-center gap-2.5 hover:opacity-80"
                                    >
                                        <img
                                            src={classIconUrl(
                                                row.character.className
                                            )}
                                            alt={row.character.className}
                                            className="h-6 w-6 rounded-full ring-1 ring-gray-700"
                                        />
                                        <span
                                            className="whitespace-nowrap font-bold"
                                            style={{
                                                color:
                                                    CLASS_COLORS[
                                                        row.character.className
                                                    ] ?? '#CCCCCC',
                                            }}
                                        >
                                            {row.character.name}
                                        </span>
                                    </Link>
                                </td>
                                {/* Avg */}
                                <td className="border-b border-gray-800/50 px-2 py-1.5 text-center">
                                    <div className="flex flex-col items-center">
                                        <MetricCell
                                            value={row.avgPercentile}
                                            scheme={WOW_QUALITY}
                                            format={(v) => v.toFixed(1)}
                                        />
                                        <span className="mt-0.5 text-[10px] text-gray-600">
                                            {row.parsedCount}/
                                            {visibleColumns.length}
                                        </span>
                                    </div>
                                </td>
                                {/* Boss columns */}
                                {visibleColumns.map(
                                    ({ encounter, difficulty }) => {
                                        const parse = row.parseByKey.get(
                                            cellKey(encounter.id, difficulty)
                                        );
                                        return (
                                            <td
                                                key={`${encounter.id}-${difficulty}`}
                                                className="border-b border-gray-800/50 px-1 py-1.5 text-center"
                                            >
                                                <MetricCell
                                                    value={
                                                        parse?.bestPercent ??
                                                        null
                                                    }
                                                    scheme={WOW_QUALITY}
                                                    format={formatPercentile}
                                                    tooltip={
                                                        parse ? (
                                                            <ParseTooltip
                                                                encounter={
                                                                    encounter
                                                                }
                                                                difficulty={
                                                                    difficulty
                                                                }
                                                                parse={parse}
                                                                character={
                                                                    row.character
                                                                }
                                                                zoneId={
                                                                    data.zoneId
                                                                }
                                                            />
                                                        ) : null
                                                    }
                                                />
                                            </td>
                                        );
                                    }
                                )}
                            </tr>
                        ))}
                        {sortedRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + 3}
                                    className="py-8 text-center text-gray-500"
                                >
                                    No raiders match your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
