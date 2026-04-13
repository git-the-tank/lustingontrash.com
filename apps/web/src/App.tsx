import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { AdminGuard } from './auth/AdminGuard';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Parses } from './pages/Parses';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminSyncs } from './pages/admin/AdminSyncs';
import { AdminFights } from './pages/AdminFights';
import { AdminPlayers } from './pages/admin/AdminPlayers';
import { Login } from './pages/Login';
import { AccessDenied } from './pages/AccessDenied';

export function App(): React.ReactElement {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route
                    element={
                        <AuthGuard>
                            <Layout />
                        </AuthGuard>
                    }
                >
                    <Route path="/" element={<Dashboard />} />
                    <Route
                        path="/character/:characterName"
                        element={<Dashboard />}
                    />
                    <Route path="/players" element={<Players />} />
                    <Route path="/parses" element={<Parses />} />
                    <Route
                        path="/admin"
                        element={
                            <AdminGuard>
                                <AdminLayout />
                            </AdminGuard>
                        }
                    >
                        <Route
                            index
                            element={<Navigate to="syncs" replace />}
                        />
                        <Route path="syncs" element={<AdminSyncs />} />
                        <Route path="fights" element={<AdminFights />} />
                        <Route path="players" element={<AdminPlayers />} />
                    </Route>
                </Route>
            </Routes>
        </AuthProvider>
    );
}
