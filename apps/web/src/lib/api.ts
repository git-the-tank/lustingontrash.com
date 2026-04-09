const BASE = import.meta.env.VITE_API_URL ?? '/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
    authToken = token;
}

export async function fetchApi<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BASE}${path}`, {
        headers,
        credentials: 'include',
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}
