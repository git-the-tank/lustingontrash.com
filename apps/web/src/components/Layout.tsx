import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { CLASS_COLORS, classIconUrl } from '../lib/classColors';
import type { UserCharacter } from '../auth/types';

const RANK_PRIORITY: Record<string, number> = { Main: 0, Trial: 1 };

function getMainCharacter(
    characters: UserCharacter[]
): UserCharacter | undefined {
    if (characters.length === 0) return undefined;
    return [...characters].sort(
        (a, b) => (RANK_PRIORITY[a.rank] ?? 99) - (RANK_PRIORITY[b.rank] ?? 99)
    )[0];
}

export function Layout(): React.ReactElement {
    const { user, logout } = useAuth();
    const mainChar = user ? getMainCharacter(user.characters) : undefined;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            <nav className="border-b border-gray-800 bg-gray-900">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="text-lg font-bold text-white">
                            Lusting on Trash
                        </Link>
                        <Link
                            to="/"
                            className="text-sm text-gray-400 hover:text-white"
                        >
                            Players
                        </Link>
                        <Link
                            to="/parses"
                            className="text-sm text-gray-400 hover:text-white"
                        >
                            Parses
                        </Link>
                    </div>
                    {user && (
                        <div className="flex items-center gap-4">
                            {mainChar && (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={classIconUrl(mainChar.className)}
                                        alt={mainChar.className}
                                        className="h-6 w-6 rounded-full ring-1 ring-gray-700"
                                    />
                                    <span
                                        className="text-sm font-bold"
                                        style={{
                                            color:
                                                CLASS_COLORS[
                                                    mainChar.className
                                                ] ?? '#CCCCCC',
                                        }}
                                    >
                                        {mainChar.name}
                                    </span>
                                </div>
                            )}
                            <span className="text-sm text-gray-500">
                                {user.battletag}
                            </span>
                            <button
                                onClick={() => void logout()}
                                className="text-sm text-gray-500 hover:text-white"
                            >
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </nav>
            <main className="mx-auto max-w-7xl px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
