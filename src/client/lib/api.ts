const BASE = '/api';

export async function fetchApi<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}
