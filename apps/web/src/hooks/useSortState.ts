import { useState, useCallback } from 'react';
import type { SortDir } from '../components/ranking/SortHeader';

// Standard click-to-toggle sort state for a ranking table. Generic over the
// set of valid sort keys (usually a string union). Calling `toggleSort(key)`
// flips the direction if the same key is clicked, or switches to the new key
// at the provided default direction.
export function useSortState<K extends string>(
    initialKey: K,
    initialDir: SortDir = 'desc'
): {
    sortKey: K;
    sortDir: SortDir;
    toggleSort: (key: K, defaultDirForNewKey?: SortDir) => void;
    setSort: (key: K, dir: SortDir) => void;
} {
    const [sortKey, setSortKey] = useState<K>(initialKey);
    const [sortDir, setSortDir] = useState<SortDir>(initialDir);

    const toggleSort = useCallback(
        (key: K, defaultDirForNewKey: SortDir = 'desc') => {
            setSortKey((current) => {
                if (current === key) {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    return current;
                }
                setSortDir(defaultDirForNewKey);
                return key;
            });
        },
        []
    );

    const setSort = useCallback((key: K, dir: SortDir) => {
        setSortKey(key);
        setSortDir(dir);
    }, []);

    return { sortKey, sortDir, toggleSort, setSort };
}
