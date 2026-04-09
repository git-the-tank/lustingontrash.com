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
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
