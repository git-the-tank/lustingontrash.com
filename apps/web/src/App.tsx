import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Players } from './pages/Players';

export function App(): React.ReactElement {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Players />} />
            </Route>
        </Routes>
    );
}
