import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from 'react';
import { fetchApi, setAuthToken, getStoredToken } from '../lib/api';
import type { User } from './types';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeJwtPayload(token: string): { exp: number } {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as { exp: number };
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}): React.ReactElement {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initRef = useRef(false);

    const scheduleRefresh = useCallback((token: string): void => {
        const { exp } = decodeJwtPayload(token);
        const msUntilRefresh =
            (exp - Math.floor(Date.now() / 1000) - 60) * 1000;

        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        const doRefresh = async (): Promise<void> => {
            try {
                const { token: newToken } = await fetchApi<{
                    token: string;
                }>('/auth/refresh', { method: 'POST' });
                setAuthToken(newToken);
                scheduleRefresh(newToken);
            } catch {
                setAuthToken(null);
                setUser(null);
            }
        };

        if (msUntilRefresh > 0) {
            refreshTimerRef.current = setTimeout(() => {
                void doRefresh();
            }, msUntilRefresh);
        } else {
            void doRefresh();
        }
    }, []);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        async function init(): Promise<void> {
            const hash = window.location.hash;
            const urlToken = hash.startsWith('#token=') ? hash.slice(7) : null;

            if (urlToken) {
                window.history.replaceState({}, '', window.location.pathname);
                setAuthToken(urlToken);
                scheduleRefresh(urlToken);

                try {
                    const userData = await fetchApi<User>('/auth/me');
                    setUser(userData);

                    // Restore the URL the user was on before the OAuth
                    // redirect, including hash-param filter state.
                    const returnUrl = sessionStorage.getItem('lot_return_url');
                    if (returnUrl) {
                        sessionStorage.removeItem('lot_return_url');
                        window.location.replace(returnUrl);
                        return;
                    }
                } catch {
                    setAuthToken(null);
                }
            } else {
                // Try sessionStorage first (survives reloads within the
                // same tab), then fall back to cookie-based refresh.
                const stored = getStoredToken();
                let recovered = false;

                if (stored) {
                    const { exp } = decodeJwtPayload(stored);
                    if (exp > Math.floor(Date.now() / 1000)) {
                        setAuthToken(stored);
                        scheduleRefresh(stored);
                        try {
                            const userData = await fetchApi<User>('/auth/me');
                            setUser(userData);
                            recovered = true;
                        } catch {
                            setAuthToken(null);
                        }
                    } else {
                        setAuthToken(null);
                    }
                }

                if (!recovered) {
                    try {
                        const { token } = await fetchApi<{
                            token: string;
                        }>('/auth/refresh', { method: 'POST' });
                        setAuthToken(token);
                        scheduleRefresh(token);

                        const userData = await fetchApi<User>('/auth/me');
                        setUser(userData);
                    } catch {
                        // Not authenticated
                    }
                }
            }

            setIsLoading(false);
        }

        void init();

        return (): void => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [scheduleRefresh]);

    const login = useCallback((): void => {
        window.location.href = `${API_BASE}/auth/login`;
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            await fetchApi('/auth/logout', { method: 'POST' });
        } finally {
            setAuthToken(null);
            setUser(null);
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: user !== null,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthState {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
