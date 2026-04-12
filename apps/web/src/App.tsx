import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { Layout } from './components/Layout';
import { Players } from './pages/Players';
import { Parses } from './pages/Parses';
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
                    <Route path="/" element={<Players />} />
                    <Route path="/parses" element={<Parses />} />
                </Route>
            </Routes>
        </AuthProvider>
    );
}
