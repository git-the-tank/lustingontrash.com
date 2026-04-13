import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import {
    syncCooldowns,
    SYNC_UNGATED_RANK,
    type SyncType,
} from '@lot/shared/sync.config.js';

interface RosterDiffCharacter {
    name: string;
    className: string;
    role: string;
    rank: string;
}
interface RosterDiffChange {
    name: string;
    from: string;
    to: string;
}
interface RosterDiff {
    total: number;
    added: RosterDiffCharacter[];
    removed: RosterDiffCharacter[];
    roleChanged: RosterDiffChange[];
    classChanged: RosterDiffChange[];
    rankChanged: RosterDiffChange[];
}

interface CharacterSyncResult {
    guild: string;
    synced: number;
    filtered: number;
    deactivated: number;
    diff: RosterDiff;
}

interface ParseSyncResult {
    characters: number;
    charactersWithData: number;
    parses: number;
    errors: { character: string; error: string }[];
}

interface SyncLogEntry {
    id: string;
    type: 'ROSTER' | 'PARSES';
    status: 'SUCCESS' | 'FAILED';
    startedAt: string;
    completedAt: string;
    durationMs: number;
    summary: string;
    details: unknown;
    error: string | null;
}

interface SyncLogResponse {
    logs: SyncLogEntry[];
}

export function AdminSyncs(): React.ReactElement {
    const { user } = useAuth();
    const isUngated = user?.guildRank === SYNC_UNGATED_RANK;
    return (
        <div>
            <h1 className="mb-6 text-xl font-bold text-white">Syncs</h1>
            <div className="flex flex-col gap-6">
                <RosterSyncCard isUngated={isUngated} />
                <ParseSyncCard isUngated={isUngated} />
            </div>
        </div>
    );
}

function useCountdown(target: Date | null): string | null {
    const [, tick] = useState(0);
    useEffect(() => {
        if (!target) return;
        const id = setInterval(() => tick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [target]);
    if (!target) return null;
    const ms = target.getTime() - Date.now();
    if (ms <= 0) return null;
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours >= 1) return `${hours}h ${minutes}m`;
    if (minutes >= 1) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function computeNextAvailable(
    lastStartedAt: string | undefined,
    type: SyncType
): Date | null {
    if (!lastStartedAt) return null;
    return new Date(new Date(lastStartedAt).getTime() + syncCooldowns[type]);
}

function RosterSyncCard({
    isUngated,
}: {
    isUngated: boolean;
}): React.ReactElement {
    const { data: logData, refetch } = useApi<SyncLogResponse>(
        '/sync/log?type=ROSTER&limit=20'
    );
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<CharacterSyncResult | null>(null);
    const [completedAt, setCompletedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const lastSuccess = logData?.logs.find((l) => l.status === 'SUCCESS');
    const nextAvailableAt = computeNextAvailable(
        lastSuccess?.startedAt,
        'ROSTER'
    );
    const countdown = useCountdown(isUngated ? null : nextAvailableAt);
    const cooldownActive = !isUngated && countdown !== null;

    async function run(): Promise<void> {
        setRunning(true);
        setError(null);
        try {
            const res = await fetchApi<CharacterSyncResult>(
                '/sync/characters',
                { method: 'POST' }
            );
            setResult(res);
            setCompletedAt(new Date());
            refetch();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync failed');
            refetch();
        } finally {
            setRunning(false);
        }
    }

    const lastSynced = logData?.logs[0]?.startedAt ?? null;

    return (
        <section className="rounded-lg border border-gray-800 bg-gray-900/40">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-white">
                            Sync roster from wowaudit
                        </h2>
                        <p className="mt-1 max-w-xl text-sm text-gray-400">
                            Pulls the current wowaudit roster and upserts Main /
                            Trial characters. Anyone no longer listed is
                            automatically deactivated. Limited to once per hour
                            except for the GM.
                        </p>
                        <LastSynced at={lastSynced} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                            onClick={() => void run()}
                            disabled={running || cooldownActive}
                            title={
                                cooldownActive
                                    ? `Next run available in ${countdown}`
                                    : undefined
                            }
                            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {running ? 'Syncing…' : 'Sync roster'}
                        </button>
                        {cooldownActive && (
                            <span className="text-xs text-gray-500">
                                Next run in {countdown}
                            </span>
                        )}
                    </div>
                </div>
                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                {result && !error && (
                    <>
                        <CompletedBanner at={completedAt} />
                        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                            <Stat label="Synced" value={result.synced} />
                            <Stat
                                label="Filtered out"
                                value={result.filtered}
                            />
                            <Stat
                                label="Deactivated"
                                value={result.deactivated}
                                highlight={result.deactivated > 0}
                            />
                        </dl>
                    </>
                )}
            </div>
            <LogTable logs={logData?.logs ?? []} kind="ROSTER" />
        </section>
    );
}

function ParseSyncCard({
    isUngated,
}: {
    isUngated: boolean;
}): React.ReactElement {
    const { data: logData, refetch } = useApi<SyncLogResponse>(
        '/sync/log?type=PARSES&limit=20'
    );
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<ParseSyncResult | null>(null);
    const [completedAt, setCompletedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const lastSuccess = logData?.logs.find((l) => l.status === 'SUCCESS');
    const nextAvailableAt = computeNextAvailable(
        lastSuccess?.startedAt,
        'PARSES'
    );
    const countdown = useCountdown(isUngated ? null : nextAvailableAt);
    const cooldownActive = !isUngated && countdown !== null;

    async function run(): Promise<void> {
        setRunning(true);
        setError(null);
        try {
            const res = await fetchApi<ParseSyncResult>('/sync/parses', {
                method: 'POST',
            });
            setResult(res);
            setCompletedAt(new Date());
            refetch();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync failed');
            refetch();
        } finally {
            setRunning(false);
        }
    }

    const lastSynced = logData?.logs[0]?.startedAt ?? null;

    return (
        <section className="rounded-lg border border-gray-800 bg-gray-900/40">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-white">
                            Pull parses from Warcraft Logs
                        </h2>
                        <p className="mt-1 max-w-xl text-sm text-gray-400">
                            Pulls current-zone parses for every active
                            character. This can take a minute or two — leave the
                            tab open. Limited to once per day except for the GM.
                        </p>
                        <LastSynced at={lastSynced} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                            onClick={() => void run()}
                            disabled={running || cooldownActive}
                            title={
                                cooldownActive
                                    ? `Next run available in ${countdown}`
                                    : undefined
                            }
                            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {running ? 'Pulling…' : 'Pull parses'}
                        </button>
                        {cooldownActive && (
                            <span className="text-xs text-gray-500">
                                Next run in {countdown}
                            </span>
                        )}
                    </div>
                </div>
                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                {result && !error && (
                    <>
                        <CompletedBanner at={completedAt} />
                        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                            <Stat
                                label="Characters"
                                value={result.characters}
                            />
                            <Stat
                                label="With data"
                                value={result.charactersWithData}
                            />
                            <Stat
                                label="Parses upserted"
                                value={result.parses}
                            />
                        </dl>
                        {result.errors.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-red-400">
                                    {result.errors.length} error
                                    {result.errors.length === 1 ? '' : 's'}
                                </p>
                                <ul className="mt-2 max-h-48 overflow-y-auto rounded-md bg-gray-950/60 p-3 text-xs text-gray-400">
                                    {result.errors.map((e, i) => (
                                        <li key={i} className="py-0.5">
                                            <span className="text-gray-300">
                                                {e.character}
                                            </span>
                                            : {e.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
            <LogTable logs={logData?.logs ?? []} kind="PARSES" />
        </section>
    );
}

function LastSynced({ at }: { at: string | null }): React.ReactElement {
    if (!at) {
        return <p className="mt-3 text-xs text-gray-500">Last synced: never</p>;
    }
    return (
        <p className="mt-3 text-xs text-gray-500">
            Last synced:{' '}
            <span className="text-gray-300">{formatFull(new Date(at))}</span>
        </p>
    );
}

function CompletedBanner({ at }: { at: Date | null }): React.ReactElement {
    const time = at
        ? at.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
          })
        : '';
    return (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
            <span aria-hidden className="text-base leading-none">
                ✓
            </span>
            <span>Completed {time && `at ${time}`}</span>
        </div>
    );
}

function Stat({
    label,
    value,
    highlight,
}: {
    label: string;
    value: number;
    highlight?: boolean;
}): React.ReactElement {
    return (
        <div className="rounded-md bg-gray-950/60 px-3 py-2">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd
                className={`mt-1 text-lg font-semibold ${
                    highlight ? 'text-amber-300' : 'text-gray-100'
                }`}
            >
                {value}
            </dd>
        </div>
    );
}

function LogTable({
    logs,
    kind,
}: {
    logs: SyncLogEntry[];
    kind: 'ROSTER' | 'PARSES';
}): React.ReactElement {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    function toggle(id: string): void {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="border-t border-gray-800">
            <div className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Recent runs
            </div>
            {logs.length === 0 ? (
                <div className="px-6 pb-6 text-sm text-gray-500">
                    No runs yet.
                </div>
            ) : (
                <div className="max-h-72 overflow-y-auto">
                    <ul>
                        {logs.map((log) => {
                            const isExpandable =
                                kind === 'ROSTER' &&
                                log.status === 'SUCCESS' &&
                                hasDiffChanges(log.details);
                            const isOpen = expanded.has(log.id);
                            return (
                                <li
                                    key={log.id}
                                    className="border-t border-gray-900 first:border-t-0"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            isExpandable && toggle(log.id)
                                        }
                                        disabled={!isExpandable}
                                        className={`grid w-full grid-cols-[1rem_11rem_1rem_1fr] items-center gap-3 px-6 py-2 text-left text-sm ${
                                            isExpandable
                                                ? 'hover:bg-gray-900/60'
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <span className="text-gray-600">
                                            {isExpandable
                                                ? isOpen
                                                    ? '▾'
                                                    : '▸'
                                                : ''}
                                        </span>
                                        <span className="font-mono text-xs text-gray-400">
                                            {formatShort(
                                                new Date(log.startedAt)
                                            )}
                                        </span>
                                        <StatusIcon status={log.status} />
                                        <span
                                            className={
                                                log.status === 'FAILED'
                                                    ? 'text-red-400'
                                                    : 'text-gray-200'
                                            }
                                        >
                                            {log.summary}
                                        </span>
                                    </button>
                                    {isExpandable && isOpen && (
                                        <RosterDiffDetails
                                            diff={
                                                (
                                                    log.details as {
                                                        diff: RosterDiff;
                                                    }
                                                ).diff
                                            }
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

function StatusIcon({
    status,
}: {
    status: 'SUCCESS' | 'FAILED';
}): React.ReactElement {
    if (status === 'SUCCESS') {
        return (
            <span className="text-emerald-400" aria-label="success">
                ✓
            </span>
        );
    }
    return (
        <span className="text-red-400" aria-label="failed">
            ⚠
        </span>
    );
}

function hasDiffChanges(details: unknown): boolean {
    if (!details || typeof details !== 'object') return false;
    const d = (details as { diff?: RosterDiff }).diff;
    if (!d) return false;
    return (
        d.added.length > 0 ||
        d.removed.length > 0 ||
        d.roleChanged.length > 0 ||
        d.classChanged.length > 0 ||
        d.rankChanged.length > 0
    );
}

function RosterDiffDetails({ diff }: { diff: RosterDiff }): React.ReactElement {
    return (
        <div className="bg-gray-950/40 px-10 pb-4 pt-2 text-xs">
            <div className="flex flex-col gap-3">
                {diff.added.length > 0 && (
                    <DiffGroup label="Added" accent="emerald">
                        {diff.added.map((c, i) => (
                            <div key={i} className="text-gray-300">
                                <span className="font-medium text-gray-100">
                                    {c.name}
                                </span>{' '}
                                <span className="text-gray-500">
                                    ({c.className}, {c.role}, {c.rank})
                                </span>
                            </div>
                        ))}
                    </DiffGroup>
                )}
                {diff.removed.length > 0 && (
                    <DiffGroup label="Removed" accent="red">
                        {diff.removed.map((c, i) => (
                            <div key={i} className="text-gray-300">
                                <span className="font-medium text-gray-100">
                                    {c.name}
                                </span>{' '}
                                <span className="text-gray-500">
                                    ({c.className}, {c.role}, {c.rank})
                                </span>
                            </div>
                        ))}
                    </DiffGroup>
                )}
                {diff.roleChanged.length > 0 && (
                    <DiffGroup label="Role" accent="amber">
                        {diff.roleChanged.map((c, i) => (
                            <ChangeRow key={i} change={c} />
                        ))}
                    </DiffGroup>
                )}
                {diff.classChanged.length > 0 && (
                    <DiffGroup label="Class" accent="amber">
                        {diff.classChanged.map((c, i) => (
                            <ChangeRow key={i} change={c} />
                        ))}
                    </DiffGroup>
                )}
                {diff.rankChanged.length > 0 && (
                    <DiffGroup label="Rank" accent="amber">
                        {diff.rankChanged.map((c, i) => (
                            <ChangeRow key={i} change={c} />
                        ))}
                    </DiffGroup>
                )}
            </div>
        </div>
    );
}

const ACCENT_COLOR: Record<'emerald' | 'red' | 'amber', string> = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
};

function DiffGroup({
    label,
    accent,
    children,
}: {
    label: string;
    accent: 'emerald' | 'red' | 'amber';
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <div className="grid grid-cols-[5rem_1fr] gap-3">
            <div
                className={`text-xs font-semibold uppercase tracking-wider ${ACCENT_COLOR[accent]}`}
            >
                {label}
            </div>
            <div className="flex flex-col gap-1">{children}</div>
        </div>
    );
}

function ChangeRow({
    change,
}: {
    change: RosterDiffChange;
}): React.ReactElement {
    return (
        <div className="text-gray-300">
            <span className="font-medium text-gray-100">{change.name}</span>{' '}
            <span className="text-gray-500">{change.from}</span>
            <span className="text-gray-600"> → </span>
            <span className="text-gray-200">{change.to}</span>
        </div>
    );
}

const FULL_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});
const SHORT_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

function formatFull(d: Date): string {
    return FULL_FMT.format(d);
}
function formatShort(d: Date): string {
    return SHORT_FMT.format(d);
}
