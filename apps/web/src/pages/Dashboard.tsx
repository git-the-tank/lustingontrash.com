import { useState, useMemo, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { CLASS_COLORS, classIconUrl } from '../lib/classColors';
import { WOW_QUALITY } from '../lib/colorSchemes/wowQuality';
import { MetricCell } from '../components/ranking/MetricCell';
import { FilterPillGroup } from '../components/ranking/FilterPillGroup';
import {
    ENCOUNTERS,
    DIFFICULTIES,
    type Difficulty,
    type Encounter,
} from '@lot/shared/encounters.config.js';
import {
    buildParseboardUrl,
    CATEGORY_KEYS,
    CATEGORY_LABEL,
    type RoleKey,
    type CategoryKey,
} from './parseFilters';

// ---- API types ----
type FightCategory = 'PROGRESSION' | 'FARM' | 'IGNORED';

interface RankResult {
    rank: number;
    total: number;
    label: string;
}

interface BucketData {
    score: number | null;
    fightCount: number;
    totalFights: number;
    classRank: RankResult | null;
    roleRank: RankResult | null;
}

interface FightData {
    encounterId: number;
    difficulty: Difficulty;
    category: FightCategory;
    bestPercent: number;
    bestSpec: string | null;
    excluded: boolean;
    excludeReason?: string;
}

interface CharacterDashboard {
    id: string;
    name: string;
    className: string;
    role: string;
    rank: string;
    progression: BucketData;
    overall: BucketData;
    fights: FightData[];
}

interface FightConfigEntry {
    encounterId: number;
    difficulty: Difficulty;
    category: FightCategory;
}

interface DashboardResponse {
    characters: CharacterDashboard[];
    fightConfig: FightConfigEntry[];
    encounters: Encounter[];
}

// ---- Helpers ----
function roleToFilterRoles(role: string): Set<RoleKey> {
    if (role === 'Tank') return new Set(['Tank']);
    if (role === 'Heal') return new Set(['Heal']);
    return new Set(['Melee', 'Ranged']);
}

const FIGHT_CATEGORY_LABEL: Record<FightCategory, string> = {
    PROGRESSION: 'Prog',
    FARM: 'Farm',
    IGNORED: 'Ignored',
};

const CATEGORY_TEXT_COLOR: Record<FightCategory, string> = {
    PROGRESSION: 'text-amber-400',
    FARM: 'text-emerald-400',
    IGNORED: 'text-gray-600',
};

// ---- Components ----

function BucketCard({
    label,
    bucket,
    scoreUrl,
    classRankUrl,
    roleRankUrl,
}: {
    label: string;
    bucket: BucketData;
    scoreUrl: string;
    classRankUrl: string;
    roleRankUrl: string;
}): ReactElement {
    return (
        <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                {label}
            </div>
            <Link
                to={scoreUrl}
                className="mb-3 flex items-baseline gap-3 hover:opacity-80"
            >
                <MetricCell
                    value={bucket.score}
                    scheme={WOW_QUALITY}
                    format={(v) => v.toFixed(1)}
                    className="!h-16 !min-w-[5.5rem] !rounded-lg !text-4xl"
                />
                <span className="text-sm text-gray-500">
                    {bucket.fightCount}/{bucket.totalFights} fights
                </span>
            </Link>
            {(bucket.roleRank || bucket.classRank) && (
                <div className="flex flex-wrap gap-2">
                    {bucket.roleRank && (
                        <RankBadge
                            rankResult={bucket.roleRank}
                            linkUrl={roleRankUrl}
                        />
                    )}
                    {bucket.classRank && (
                        <RankBadge
                            rankResult={bucket.classRank}
                            linkUrl={classRankUrl}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function rankColor(rank: number, total: number): string {
    // Percentile position: 1st of 10 = 100th percentile, 10th of 10 = 10th
    const pct = ((total - rank) / (total - 1)) * 100;
    if (total <= 1) return 'text-gray-400';
    if (pct >= 95) return 'text-[#ff8000]'; // legendary
    if (pct >= 75) return 'text-[#c26ffa]'; // epic
    if (pct >= 50) return 'text-[#4a9eff]'; // rare
    if (pct >= 25) return 'text-[#55e031]'; // uncommon
    return 'text-gray-300'; // common
}

function RankBadge({
    rankResult,
    linkUrl,
}: {
    rankResult: RankResult;
    linkUrl: string;
}): ReactElement {
    const color = rankColor(rankResult.rank, rankResult.total);
    return (
        <Link
            to={linkUrl}
            className="inline-flex flex-col items-center rounded-lg bg-gray-800/60 px-4 py-2 ring-1 ring-gray-700/40 transition-colors hover:bg-gray-800 hover:ring-gray-600/50"
        >
            <span
                className={`font-mono text-2xl font-bold tabular-nums ${color}`}
            >
                {rankResult.rank}
                <span className="text-sm text-gray-500">
                    /{rankResult.total}
                </span>
            </span>
            <span className="text-xs text-gray-400">{rankResult.label}</span>
        </Link>
    );
}

function CharacterPanel({
    character,
}: {
    character: CharacterDashboard;
}): ReactElement {
    const roleRoles = roleToFilterRoles(character.role);

    const progUrl = buildParseboardUrl({ category: 'prog' });

    function classRankUrl(bucket: CategoryKey): string {
        return buildParseboardUrl({
            category: bucket,
            roles: roleRoles,
            className: character.className,
        });
    }

    function roleRankUrl(bucket: CategoryKey): string {
        return buildParseboardUrl({
            category: bucket,
            roles: roleRoles,
        });
    }

    // Local fight-breakdown filter — same "empty or full set = show all" rule
    // as the parseboard. Empty is the initial state so every fight is visible.
    const [fightFilter, setFightFilter] = useState<Set<CategoryKey>>(
        () => new Set()
    );

    const toggleFightFilter = (cat: CategoryKey): void => {
        setFightFilter((prev) => {
            const showingAll =
                prev.size === 0 || prev.size === CATEGORY_KEYS.length;
            if (showingAll) return new Set([cat]);
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            if (next.size === CATEGORY_KEYS.length) return new Set();
            return next;
        });
    };

    const CATEGORY_PRIORITY: Record<FightCategory, number> = {
        PROGRESSION: 0,
        FARM: 1,
        IGNORED: 2,
    };

    const DIFF_PRIORITY: Record<string, number> = {
        MYTHIC: 0,
        HEROIC: 1,
        NORMAL: 2,
    };

    const filteredFights = useMemo(() => {
        const active =
            fightFilter.size > 0 && fightFilter.size < CATEGORY_KEYS.length;
        const wantProg = fightFilter.has('prog');
        const wantFarm = fightFilter.has('farm');
        const result: Array<{ fight: FightData; encounter: Encounter }> = [];
        for (const diff of DIFFICULTIES) {
            for (const enc of ENCOUNTERS) {
                const fight = character.fights.find(
                    (f) => f.encounterId === enc.id && f.difficulty === diff
                );
                if (!fight) continue;
                if (active) {
                    if (
                        wantProg &&
                        !wantFarm &&
                        fight.category !== 'PROGRESSION'
                    )
                        continue;
                    if (wantFarm && !wantProg && fight.category !== 'FARM')
                        continue;
                }
                result.push({ fight, encounter: enc });
            }
        }
        // Sort: category priority, then difficulty (mythic first), then harder/later bosses first
        result.sort((a, b) => {
            const catDiff =
                CATEGORY_PRIORITY[a.fight.category] -
                CATEGORY_PRIORITY[b.fight.category];
            if (catDiff !== 0) return catDiff;
            const diffDiff =
                DIFF_PRIORITY[a.fight.difficulty] -
                DIFF_PRIORITY[b.fight.difficulty];
            if (diffDiff !== 0) return diffDiff;
            return b.encounter.order - a.encounter.order;
        });
        return result;
    }, [character.fights, fightFilter]);

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <img
                    src={classIconUrl(character.className)}
                    alt={character.className}
                    className="h-8 w-8 rounded-full ring-1 ring-gray-700"
                />
                <span
                    className="text-lg font-bold"
                    style={{
                        color: CLASS_COLORS[character.className] ?? '#CCCCCC',
                    }}
                >
                    {character.name}
                </span>
                <span className="text-sm text-gray-500">
                    {character.role} · {character.rank}
                </span>
            </div>

            {/* Score + rankings cards */}
            <div className="mb-6 flex gap-4">
                <BucketCard
                    label="Progression"
                    bucket={character.progression}
                    scoreUrl={progUrl}
                    classRankUrl={classRankUrl('prog')}
                    roleRankUrl={roleRankUrl('prog')}
                />
            </div>

            {/* Fight breakdown */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Fight Breakdown
                    </span>
                    <FilterPillGroup<CategoryKey>
                        values={CATEGORY_KEYS}
                        selected={fightFilter}
                        onToggle={toggleFightFilter}
                        renderLabel={(c) => CATEGORY_LABEL[c]}
                    />
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/80">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-700/60">
                                <th className="px-3 py-2 text-xs font-medium text-gray-400">
                                    Encounter
                                </th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-400">
                                    Difficulty
                                </th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-400">
                                    Category
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-400">
                                    Parse
                                </th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-400">
                                    Spec
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFights.map(({ fight, encounter: enc }) => (
                                <tr
                                    key={`${enc.id}-${fight.difficulty}`}
                                    className={`border-b border-gray-800/50 ${fight.excluded ? 'opacity-40' : ''}`}
                                >
                                    <td className="px-3 py-1.5 text-gray-200">
                                        {enc.name}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-400">
                                        {fight.difficulty.charAt(0) +
                                            fight.difficulty
                                                .slice(1)
                                                .toLowerCase()}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span
                                            className={`text-xs font-medium ${CATEGORY_TEXT_COLOR[fight.category]}`}
                                        >
                                            {
                                                FIGHT_CATEGORY_LABEL[
                                                    fight.category
                                                ]
                                            }
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <MetricCell
                                            value={
                                                fight.excluded
                                                    ? null
                                                    : fight.bestPercent
                                            }
                                            scheme={WOW_QUALITY}
                                            format={(v) =>
                                                Math.round(v).toString()
                                            }
                                        />
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-400">
                                        {fight.bestSpec ?? '—'}
                                        {fight.excluded &&
                                            fight.excludeReason && (
                                                <span
                                                    className="ml-1 text-xs text-red-400"
                                                    title={fight.excludeReason}
                                                >
                                                    (excluded)
                                                </span>
                                            )}
                                    </td>
                                </tr>
                            ))}
                            {filteredFights.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 text-center text-gray-500"
                                    >
                                        No fights in this category.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ---- Main Dashboard ----
export function Dashboard(): ReactElement {
    const { characterName } = useParams<{ characterName?: string }>();
    const apiPath = characterName
        ? `/dashboard/${encodeURIComponent(characterName)}`
        : '/dashboard';
    const { data, isLoading, error } = useApi<DashboardResponse>(apiPath);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const isViewingOther = Boolean(characterName);

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 py-20 text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-amber-500" />
                Loading dashboard...
            </div>
        );
    }

    if (error) {
        return <p className="py-20 text-red-400">{error}</p>;
    }

    if (!data || data.characters.length === 0) {
        return (
            <div className="py-20 text-gray-500">
                {isViewingOther ? (
                    <p>Character &quot;{characterName}&quot; not found.</p>
                ) : (
                    <>
                        <p>No characters linked to your account.</p>
                        <p className="mt-2 text-sm">
                            Your Battle.net characters will appear here once
                            they are synced with the guild roster.
                        </p>
                    </>
                )}
            </div>
        );
    }

    const character = data.characters[selectedIndex] ?? data.characters[0];

    return (
        <div>
            <div className="mb-6 flex items-baseline gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-amber-100">
                    Dashboard
                </h1>
                {isViewingOther && (
                    <Link
                        to="/"
                        className="text-sm text-gray-500 hover:text-amber-300"
                    >
                        Back to my dashboard
                    </Link>
                )}
            </div>

            {/* Character tabs (only for own dashboard with multiple chars) */}
            {!isViewingOther && data.characters.length > 1 && (
                <div className="mb-6 flex gap-2">
                    {data.characters.map((c, i) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedIndex(i)}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
                                i === selectedIndex
                                    ? 'bg-amber-900/60 text-amber-200 ring-amber-700/50'
                                    : 'bg-gray-800/60 text-gray-400 ring-gray-700/40 hover:bg-gray-800 hover:text-gray-300'
                            }`}
                        >
                            <img
                                src={classIconUrl(c.className)}
                                alt={c.className}
                                className="h-4 w-4 rounded-full"
                            />
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            <CharacterPanel character={character} />
        </div>
    );
}
