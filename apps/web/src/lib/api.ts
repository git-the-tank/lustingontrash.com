const BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'lot_jwt';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
    authToken = token;
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

export function getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
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
