export const syncCooldowns = {
    ROSTER: 60 * 60 * 1000, // 1 hour
    PARSES: 24 * 60 * 60 * 1000, // 1 day
} as const;

export type SyncType = keyof typeof syncCooldowns;

// Guild rank that bypasses cooldowns (0 = GM).
export const SYNC_UNGATED_RANK = 0;
