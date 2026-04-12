import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AdminGuard({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    const { user } = useAuth();

    if (user?.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
