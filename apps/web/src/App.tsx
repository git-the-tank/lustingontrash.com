import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { AdminGuard } from './auth/AdminGuard';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Parses } from './pages/Parses';
import { AdminFights } from './pages/AdminFights';
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
                        path="/admin/fights"
                        element={
                            <AdminGuard>
                                <AdminFights />
                            </AdminGuard>
                        }
                    />
                </Route>
            </Routes>
        </AuthProvider>
    );
}
