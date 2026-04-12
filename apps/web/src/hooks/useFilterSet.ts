import { useState, useCallback } from 'react';

// Set-backed filter state with a toggle helper. Pass an initial selection to
// start with certain values enabled; pass nothing for an empty set.
export function useFilterSet<T>(initial?: Iterable<T>): {
    set: Set<T>;
    has: (value: T) => boolean;
    toggle: (value: T) => void;
    clear: () => void;
    setAll: (next: Set<T>) => void;
} {
    const [set, setInternal] = useState<Set<T>>(() => new Set(initial));

    const toggle = useCallback((value: T) => {
        setInternal((current) => {
            const next = new Set(current);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    }, []);

    const clear = useCallback(() => setInternal(new Set()), []);

    const has = useCallback((value: T) => set.has(value), [set]);

    const setAll = useCallback((next: Set<T>) => setInternal(next), []);

    return { set, has, toggle, clear, setAll };
}
