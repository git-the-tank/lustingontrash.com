import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { CLASS_COLORS, classIconUrl } from '../lib/classColors';

interface Character {
    id: string;
    name: string;
    server: string;
    className: string;
    role: string;
    rank: string;
    guild: {
        name: string;
    };
}

const ROLES = ['Tank', 'Heal', 'Melee', 'Ranged'] as const;
const RANKS = ['Main', 'Trial'] as const;

type SortKey = 'name' | 'server' | 'role' | 'rank' | 'className';
type SortDir = 'asc' | 'desc';

const ROLE_ORDER: Record<string, number> = {
    Tank: 0,
    Heal: 1,
    Melee: 2,
    Ranged: 3,
};

function roleIconUrl(role: string): string {
    return `/img/roles/${role}.png`;
}

function RankBadge({ rank }: { rank: string }): React.ReactElement {
    const isMain = rank === 'Main';
    return (
        <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                isMain
                    ? 'bg-amber-900/60 text-amber-300 ring-1 ring-amber-700/50'
                    : 'bg-sky-900/40 text-sky-300 ring-1 ring-sky-700/50'
            }`}
        >
            {rank}
        </span>
    );
}

function FilterPill({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}): React.ReactElement {
    return (
        <button
            onClick={onClick}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                    ? 'bg-amber-900/60 text-amber-200 ring-1 ring-amber-700/50'
                    : 'bg-gray-800/60 text-gray-400 ring-1 ring-gray-700/40 hover:bg-gray-800 hover:text-gray-300'
            }`}
        >
            {label}
        </button>
    );
}

function SortHeader({
    label,
    sortKey,
    currentSort,
    currentDir,
    onSort,
}: {
    label: string;
    sortKey: SortKey;
    currentSort: SortKey;
    currentDir: SortDir;
    onSort: (key: SortKey) => void;
}): React.ReactElement {
    const isActive = currentSort === sortKey;
    return (
        <button
            onClick={() => onSort(sortKey)}
            className="group flex items-center gap-1 font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200"
        >
            {label}
            <span
                className={`text-[10px] ${isActive ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-500'}`}
            >
                {isActive ? (currentDir === 'asc' ? '▲' : '▼') : '▲'}
            </span>
        </button>
    );
}

function compareStr(a: string, b: string, dir: SortDir): number {
    const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
}

export function Players(): React.ReactElement {
    const { data, isLoading, error } = useApi<Character[]>('/characters');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
    const [rankFilter, setRankFilter] = useState<Set<string>>(new Set());
    const [classFilter, setClassFilter] = useState<Set<string>>(new Set());
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const classes = useMemo(() => {
        if (!data) return [];
        return [...new Set(data.map((c) => c.className))].sort();
    }, [data]);

    function toggleFilter(
        set: Set<string>,
        setter: (s: Set<string>) => void,
        value: string
    ): void {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        setter(next);
    }

    function handleSort(key: SortKey): void {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    const filtered = useMemo(() => {
        if (!data) return [];
        let result = data;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.server.toLowerCase().includes(q)
            );
        }
        if (roleFilter.size > 0) {
            result = result.filter((c) => roleFilter.has(c.role));
        }
        if (rankFilter.size > 0) {
            result = result.filter((c) => rankFilter.has(c.rank));
        }
        if (classFilter.size > 0) {
            result = result.filter((c) => classFilter.has(c.className));
        }

        return [...result].sort((a, b) => {
            if (sortKey === 'role') {
                const diff =
                    (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
                return sortDir === 'asc' ? diff : -diff;
            }
            if (sortKey === 'rank') {
                const rankOrder: Record<string, number> = {
                    Main: 0,
                    Trial: 1,
                };
                const diff =
                    (rankOrder[a.rank] ?? 99) - (rankOrder[b.rank] ?? 99);
                return sortDir === 'asc' ? diff : -diff;
            }
            return compareStr(
                a[sortKey as 'name' | 'server' | 'className'],
                b[sortKey as 'name' | 'server' | 'className'],
                sortDir
            );
        });
    }, [data, search, roleFilter, rankFilter, classFilter, sortKey, sortDir]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 py-20 text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-amber-500" />
                Loading roster...
            </div>
        );
    }

    if (error) {
        return <p className="py-20 text-red-400">{error}</p>;
    }

    if (!data || data.length === 0) {
        return (
            <div className="py-20 text-gray-500">
                <p>No players synced yet.</p>
                <p className="mt-2 text-sm">
                    POST to /api/sync/characters to get started.
                </p>
            </div>
        );
    }

    const hasFilters =
        search ||
        roleFilter.size > 0 ||
        rankFilter.size > 0 ||
        classFilter.size > 0;

    return (
        <div>
            <div className="mb-6 flex items-baseline gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-amber-100">
                    {data[0].guild.name}
                </h1>
                <span className="text-sm text-gray-500">
                    {filtered.length}
                    {hasFilters ? ` / ${data.length}` : ''} raiders
                </span>
            </div>

            <div className="mb-4 flex flex-wrap items-start gap-x-6 gap-y-3">
                <input
                    type="text"
                    placeholder="Search name or realm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700/50"
                />

                <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-xs text-gray-500">Role</span>
                    {ROLES.map((role) => (
                        <FilterPill
                            key={role}
                            label={role}
                            active={roleFilter.has(role)}
                            onClick={() =>
                                toggleFilter(roleFilter, setRoleFilter, role)
                            }
                        />
                    ))}
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-xs text-gray-500">Rank</span>
                    {RANKS.map((rank) => (
                        <FilterPill
                            key={rank}
                            label={rank}
                            active={rankFilter.has(rank)}
                            onClick={() =>
                                toggleFilter(rankFilter, setRankFilter, rank)
                            }
                        />
                    ))}
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-xs text-gray-500">Class</span>
                    {classes.map((cls) => (
                        <button
                            key={cls}
                            onClick={() =>
                                toggleFilter(classFilter, setClassFilter, cls)
                            }
                            title={cls}
                            className={`rounded-md p-0.5 transition-colors ${
                                classFilter.has(cls)
                                    ? 'bg-amber-900/60 ring-1 ring-amber-700/50'
                                    : 'opacity-50 hover:opacity-80'
                            }`}
                        >
                            <img
                                src={classIconUrl(cls)}
                                alt={cls}
                                className="h-5 w-5 rounded-full"
                            />
                        </button>
                    ))}
                </div>

                {hasFilters && (
                    <button
                        onClick={() => {
                            setSearch('');
                            setRoleFilter(new Set());
                            setRankFilter(new Set());
                            setClassFilter(new Set());
                        }}
                        className="text-xs text-gray-500 hover:text-gray-300"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/80 shadow-xl shadow-black/30">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-700/60 bg-gray-900">
                            <th className="py-3 pl-4 pr-3">
                                <SortHeader
                                    label="Name"
                                    sortKey="name"
                                    currentSort={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                            </th>
                            <th className="px-3 py-3">
                                <SortHeader
                                    label="Realm"
                                    sortKey="server"
                                    currentSort={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                            </th>
                            <th className="px-3 py-3">
                                <SortHeader
                                    label="Role"
                                    sortKey="role"
                                    currentSort={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                            </th>
                            <th className="py-3 pl-3 pr-4">
                                <SortHeader
                                    label="Rank"
                                    sortKey="rank"
                                    currentSort={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((char, i) => (
                            <tr
                                key={char.id}
                                className={`border-b border-gray-800/50 transition-colors hover:bg-gray-800/40 ${
                                    i % 2 === 0
                                        ? 'bg-gray-900/30'
                                        : 'bg-gray-950/30'
                                }`}
                            >
                                <td className="py-2.5 pl-4 pr-3">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={classIconUrl(char.className)}
                                            alt={char.className}
                                            className="h-7 w-7 rounded-full ring-1 ring-gray-700"
                                        />
                                        <span
                                            className="font-bold"
                                            style={{
                                                color:
                                                    CLASS_COLORS[
                                                        char.className
                                                    ] ?? '#CCCCCC',
                                            }}
                                        >
                                            {char.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-gray-400">
                                    {char.server}
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={roleIconUrl(char.role)}
                                            alt={char.role}
                                            className="h-5 w-5"
                                        />
                                        <span className="text-gray-300">
                                            {char.role}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-2.5 pl-3 pr-4">
                                    <RankBadge rank={char.rank} />
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="py-8 text-center text-gray-500"
                                >
                                    No players match your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
