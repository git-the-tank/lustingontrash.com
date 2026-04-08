import { Link, Outlet } from 'react-router-dom';

export function Layout(): React.ReactElement {
    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            <nav className="border-b border-gray-800 bg-gray-900">
                <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
                    <Link to="/" className="text-lg font-bold text-white">
                        parseboard
                    </Link>
                    <Link
                        to="/"
                        className="text-sm text-gray-400 hover:text-white"
                    >
                        Players
                    </Link>
                </div>
            </nav>
            <main className="mx-auto max-w-7xl px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
