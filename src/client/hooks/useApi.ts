import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

interface UseApiResult<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useApi<T>(path: string): UseApiResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchCount, setFetchCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load(): Promise<void> {
            setIsLoading(true);
            setError(null);

            try {
                const result = await fetchApi<T>(path);
                if (!cancelled) {
                    setData(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : 'An error occurred'
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [path, fetchCount]);

    function refetch(): void {
        setFetchCount((c) => c + 1);
    }

    return { data, isLoading, error, refetch };
}
