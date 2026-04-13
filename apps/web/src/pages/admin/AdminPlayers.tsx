import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { fetchApi } from '../../lib/api';
import { CLASS_COLORS, classIconUrl } from '../../lib/classColors';

const ROSTER_URL =
    'https://wowaudit.com/us/area-52/lusting-on-trash/main/roster';

type RoleOverride = 'Tank' | 'Heal' | 'Melee' | 'Ranged';
const ROLE_OPTIONS: RoleOverride[] = ['Tank', 'Heal', 'Melee', 'Ranged'];

interface AdminCharacter {
    id: string;
    name: string;
    server: string;
    className: string;
    role: string;
    roleOverride: string | null;
    rank: string;
    active: boolean;
}

interface RosterSyncResult {
    guild: string;
    synced: number;
    filtered: number;
    deactivated: number;
}

export function AdminPlayers(): React.ReactElement {
    const { data, isLoading, error, refetch } =
        useApi<AdminCharacter[]>('/characters');
    const [characters, setCharacters] = useState<AdminCharacter[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [rowError, setRowError] = useState<{
        id: string;
        msg: string;
    } | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    useEffect(() => {
        if (data) {
            setCharacters(data);
        }
    }, [data]);

    async function handleRoleChange(id: string, value: string): Promise<void> {
        const roleOverride: RoleOverride | null =
            value === '' ? null : (value as RoleOverride);
        const prev = characters;
        setCharacters((cs) =>
            cs.map((c) => (c.id === id ? { ...c, roleOverride } : c))
        );
        setSavingId(id);
        setRowError(null);
        try {
            await fetchApi(`/admin/characters/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ roleOverride }),
            });
        } catch (err) {
            setCharacters(prev);
            setRowError({
                id,
                msg: err instanceof Error ? err.message : 'Failed to save',
            });
        } finally {
            setSavingId(null);
        }
    }

    async function syncRoster(): Promise<void> {
        setSyncing(true);
        setSyncMessage(null);
        try {
            const res = await fetchApi<RosterSyncResult>('/sync/characters', {
                method: 'POST',
            });
            setSyncMessage(
                `Synced ${res.synced} · deactivated ${res.deactivated}`
            );
            refetch();
        } catch (err) {
            setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Players</h1>
            </div>

            <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-300">
                            Roster source:{' '}
                            <span className="font-medium text-white">
                                wowaudit
                            </span>
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Only active Mains and Trials are shown. Changes to
                            role here override the wowaudit role and are
                            preserved across resyncs.{' '}
                            <a
                                href={ROSTER_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:text-amber-300"
                            >
                                Open wowaudit roster ↗
                            </a>
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        {syncMessage && (
                            <span className="text-xs text-gray-400">
                                {syncMessage}
                            </span>
                        )}
                        <button
                            onClick={() => void syncRoster()}
                            disabled={syncing}
                            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
                        >
                            {syncing ? 'Syncing…' : 'Sync roster'}
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && <div className="text-gray-400">Loading…</div>}
            {error && <div className="text-red-400">Error: {error}</div>}

            {!isLoading && !error && (
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                            <th className="py-2 pr-4 font-medium">Character</th>
                            <th className="py-2 pr-4 font-medium">Rank</th>
                            <th className="py-2 pr-4 font-medium">
                                Wowaudit role
                            </th>
                            <th className="py-2 pr-4 font-medium">
                                Role override
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {characters.map((c) => {
                            const isSaving = savingId === c.id;
                            const err =
                                rowError && rowError.id === c.id
                                    ? rowError.msg
                                    : null;
                            return (
                                <tr
                                    key={c.id}
                                    className="border-b border-gray-800/50 text-sm"
                                >
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={classIconUrl(c.className)}
                                                alt={c.className}
                                                className="h-5 w-5 rounded-full ring-1 ring-gray-700"
                                            />
                                            <span
                                                className="font-medium"
                                                style={{
                                                    color:
                                                        CLASS_COLORS[
                                                            c.className
                                                        ] ?? '#CCCCCC',
                                                }}
                                            >
                                                {c.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4 text-gray-400">
                                        {c.rank}
                                    </td>
                                    <td className="py-3 pr-4 text-gray-400">
                                        {c.role}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={c.roleOverride ?? ''}
                                                onChange={(e) =>
                                                    void handleRoleChange(
                                                        c.id,
                                                        e.target.value
                                                    )
                                                }
                                                disabled={isSaving}
                                                className="rounded-md border border-gray-800 bg-gray-950 px-2 py-1 text-sm text-gray-200 focus:border-amber-600 focus:outline-none disabled:opacity-50"
                                            >
                                                <option value="">
                                                    (use wowaudit)
                                                </option>
                                                {ROLE_OPTIONS.map((r) => (
                                                    <option key={r} value={r}>
                                                        {r}
                                                    </option>
                                                ))}
                                            </select>
                                            {isSaving && (
                                                <span className="text-xs text-gray-500">
                                                    saving…
                                                </span>
                                            )}
                                            {err && (
                                                <span className="text-xs text-red-400">
                                                    {err}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
