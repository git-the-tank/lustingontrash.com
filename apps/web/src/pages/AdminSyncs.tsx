import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchApi } from '../lib/api';

interface SyncReportsResult {
    reportsDiscovered: number;
    fightsIngested: number;
    actorsNormalized: number;
    abilitiesNormalized: number;
    npcsNormalized: number;
    errors: { report?: string; error: string }[];
}

interface SyncLogEntry {
    id: string;
    type: string;
    status: 'SUCCESS' | 'FAILED';
    startedAt: string;
    completedAt: string;
    durationMs: number;
    summary: string;
    error: string | null;
}

interface SyncLogsResponse {
    logs: SyncLogEntry[];
}

export function AdminSyncs(): React.ReactElement {
    const {
        data: logsData,
        isLoading: logsLoading,
        refetch: refetchLogs,
    } = useApi<SyncLogsResponse>('/sync/logs');

    const [syncing, setSyncing] = useState(false);
    const [lastResult, setLastResult] = useState<SyncReportsResult | null>(
        null
    );
    const [syncError, setSyncError] = useState<string | null>(null);

    async function handleSyncReports(): Promise<void> {
        setSyncing(true);
        setLastResult(null);
        setSyncError(null);
        try {
            const result = await fetchApi<SyncReportsResult>('/sync/reports', {
                method: 'POST',
            });
            setLastResult(result);
            refetchLogs();
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div className="space-y-8">
            <h1 className="text-xl font-semibold text-white">Syncs</h1>

            {/* Sync triggers */}
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-medium text-white">
                            Report Discovery
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Fetches guild reports from WCL and ingests fights,
                            actors, and abilities.
                        </p>
                    </div>
                    <button
                        onClick={() => void handleSyncReports()}
                        disabled={syncing}
                        className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
                    >
                        {syncing ? 'Syncing…' : 'Sync Reports'}
                    </button>
                </div>

                {/* Inline result */}
                {lastResult && (
                    <div className="mt-4 rounded border border-gray-700 bg-gray-800 px-4 py-3 text-xs">
                        <p
                            className={
                                lastResult.errors.length === 0
                                    ? 'text-emerald-400'
                                    : 'text-amber-400'
                            }
                        >
                            {lastResult.reportsDiscovered} reports &middot;{' '}
                            {lastResult.fightsIngested} fights &middot;{' '}
                            {lastResult.actorsNormalized} actors &middot;{' '}
                            {lastResult.abilitiesNormalized} abilities &middot;{' '}
                            {lastResult.npcsNormalized} NPCs
                            {lastResult.errors.length > 0 &&
                                ` · ${lastResult.errors.length} errors`}
                        </p>
                        {lastResult.errors.length > 0 && (
                            <ul className="mt-2 space-y-1">
                                {lastResult.errors.map((e, i) => (
                                    <li key={i} className="text-red-400">
                                        {e.report ? `${e.report}: ` : ''}
                                        {e.error}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {syncError && (
                    <p className="mt-3 text-xs text-red-400">{syncError}</p>
                )}
            </section>

            {/* Sync log history */}
            <section>
                <h2 className="mb-3 text-sm font-medium text-gray-400">
                    Recent runs
                </h2>
                {logsLoading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                ) : !logsData?.logs.length ? (
                    <p className="text-sm text-gray-500">No runs yet.</p>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-800 text-left text-gray-500">
                                <th className="pb-2 pr-4 font-normal">Type</th>
                                <th className="pb-2 pr-4 font-normal">
                                    Status
                                </th>
                                <th className="pb-2 pr-4 font-normal">
                                    Started
                                </th>
                                <th className="pb-2 pr-4 font-normal">
                                    Duration
                                </th>
                                <th className="pb-2 font-normal">Summary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logsData.logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="border-b border-gray-800/50"
                                >
                                    <td className="py-2 pr-4 text-gray-400">
                                        {log.type}
                                    </td>
                                    <td className="py-2 pr-4">
                                        <span
                                            className={
                                                log.status === 'SUCCESS'
                                                    ? 'text-emerald-400'
                                                    : 'text-red-400'
                                            }
                                        >
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-4 text-gray-500">
                                        {new Date(
                                            log.startedAt
                                        ).toLocaleString()}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-500">
                                        {(log.durationMs / 1000).toFixed(1)}s
                                    </td>
                                    <td className="py-2 text-gray-300">
                                        {log.summary}
                                        {log.error && (
                                            <span className="ml-2 text-red-400">
                                                — {log.error.slice(0, 80)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
