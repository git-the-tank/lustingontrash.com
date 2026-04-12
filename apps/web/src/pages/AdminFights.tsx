import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchApi } from '../lib/api';
import {
    ENCOUNTERS,
    DIFFICULTIES,
    type Difficulty,
    type Encounter,
} from '@lot/shared/encounters.config.js';

type FightCategory = 'PROGRESSION' | 'FARM' | 'IGNORED';

interface FightConfigResponse {
    configs: Array<{
        encounterId: number;
        difficulty: Difficulty;
        category: FightCategory;
    }>;
}

const CATEGORY_OPTIONS: Array<{ value: FightCategory; label: string }> = [
    { value: 'PROGRESSION', label: 'Prog' },
    { value: 'FARM', label: 'Farm' },
    { value: 'IGNORED', label: 'Ignore' },
];

const CATEGORY_COLORS: Record<FightCategory, { active: string; ring: string }> =
    {
        PROGRESSION: {
            active: 'bg-amber-900/60 text-amber-200',
            ring: 'ring-amber-700/50',
        },
        FARM: {
            active: 'bg-emerald-900/60 text-emerald-200',
            ring: 'ring-emerald-700/50',
        },
        IGNORED: {
            active: 'bg-gray-800/60 text-gray-400',
            ring: 'ring-gray-700/40',
        },
    };

const DIFF_DISPLAY_ORDER: Difficulty[] = ['MYTHIC', 'HEROIC', 'NORMAL'];
const DIFF_LABELS: Record<Difficulty, string> = {
    MYTHIC: 'Mythic',
    HEROIC: 'Heroic',
    NORMAL: 'Normal',
};

function configKey(encounterId: number, difficulty: string): string {
    return `${encounterId}:${difficulty}`;
}

export function AdminFights(): React.ReactElement {
    const { data, isLoading, error } =
        useApi<FightConfigResponse>('/fight-config');
    const [configs, setConfigs] = useState<Map<string, FightCategory>>(
        new Map()
    );
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!data) return;
        const map = new Map<string, FightCategory>();
        for (const c of data.configs) {
            map.set(configKey(c.encounterId, c.difficulty), c.category);
        }
        setConfigs(map);
        setDirty(false);
    }, [data]);

    function setCategory(
        encounter: Encounter,
        difficulty: Difficulty,
        category: FightCategory
    ): void {
        setConfigs((prev) => {
            const next = new Map(prev);
            next.set(configKey(encounter.id, difficulty), category);
            return next;
        });
        setDirty(true);
        setSaveMessage(null);
    }

    async function handleSave(): Promise<void> {
        setSaving(true);
        setSaveMessage(null);
        try {
            const configList: Array<{
                encounterId: number;
                difficulty: Difficulty;
                category: FightCategory;
            }> = [];
            for (const encounter of ENCOUNTERS) {
                for (const difficulty of DIFFICULTIES) {
                    const key = configKey(encounter.id, difficulty);
                    const category = configs.get(key) ?? 'IGNORED';
                    configList.push({
                        encounterId: encounter.id,
                        difficulty,
                        category,
                    });
                }
            }
            await fetchApi('/fight-config', {
                method: 'PUT',
                body: JSON.stringify({ configs: configList }),
            });
            setSaveMessage('Saved');
            setDirty(false);
        } catch (err) {
            setSaveMessage(
                err instanceof Error ? err.message : 'Failed to save'
            );
        } finally {
            setSaving(false);
        }
    }

    if (isLoading) {
        return <div className="text-gray-400">Loading fight config...</div>;
    }

    if (error) {
        return <div className="text-red-400">Error: {error}</div>;
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">
                    Fight Configuration
                </h1>
                <div className="flex items-center gap-3">
                    {saveMessage && (
                        <span
                            className={`text-sm ${saveMessage === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                            {saveMessage}
                        </span>
                    )}
                    <button
                        onClick={() => void handleSave()}
                        disabled={saving || !dirty}
                        className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-700"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-800">
                        <th className="py-2 pr-4 text-left text-sm font-medium text-gray-400">
                            Encounter
                        </th>
                        {DIFF_DISPLAY_ORDER.map((d) => (
                            <th
                                key={d}
                                className="px-2 py-2 text-center text-sm font-medium text-gray-400"
                            >
                                {DIFF_LABELS[d]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {ENCOUNTERS.map((encounter) => (
                        <tr
                            key={encounter.id}
                            className="border-b border-gray-800/50"
                        >
                            <td className="py-3 pr-4 text-sm text-gray-200">
                                {encounter.name}
                            </td>
                            {DIFF_DISPLAY_ORDER.map((difficulty) => {
                                const key = configKey(encounter.id, difficulty);
                                const current = configs.get(key) ?? 'IGNORED';
                                return (
                                    <td
                                        key={difficulty}
                                        className="px-2 py-3 text-center"
                                    >
                                        <div className="inline-flex gap-1">
                                            {CATEGORY_OPTIONS.map((opt) => {
                                                const isActive =
                                                    current === opt.value;
                                                const colors =
                                                    CATEGORY_COLORS[opt.value];
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() =>
                                                            setCategory(
                                                                encounter,
                                                                difficulty,
                                                                opt.value
                                                            )
                                                        }
                                                        className={`rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors ${
                                                            isActive
                                                                ? `${colors.active} ${colors.ring}`
                                                                : 'bg-gray-900/40 text-gray-600 ring-gray-800/40 hover:bg-gray-800/60 hover:text-gray-400'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
