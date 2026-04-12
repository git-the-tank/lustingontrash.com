import { useState, useCallback, useEffect } from 'react';

// Bidirectional sync between React state and window.location.hash params.
// Uses replaceState to avoid polluting browser history on every filter change.
// Responds to back/forward navigation via the hashchange event.
export function useHashParams(): [
    URLSearchParams,
    (updater: (p: URLSearchParams) => void) => void,
] {
    const [params, setParams] = useState(
        () => new URLSearchParams(window.location.hash.slice(1))
    );

    const update = useCallback((updater: (p: URLSearchParams) => void) => {
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            updater(next);

            // Clean up empty params
            for (const [key, val] of [...next.entries()]) {
                if (val === '') next.delete(key);
            }

            const str = next.toString();
            window.history.replaceState(
                null,
                '',
                str ? `#${str}` : window.location.pathname
            );
            return next;
        });
    }, []);

    useEffect(() => {
        function onHashChange(): void {
            setParams(new URLSearchParams(window.location.hash.slice(1)));
        }
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    return [params, update];
}
