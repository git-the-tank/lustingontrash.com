import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) {
        // Save the current URL so we can restore it after OAuth completes.
        // This preserves hash-param filter state (e.g., /parses#d=m&e=1.6).
        sessionStorage.setItem(
            'lot_return_url',
            window.location.pathname + window.location.hash
        );
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
