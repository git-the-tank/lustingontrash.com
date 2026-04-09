import { useAuth } from '../auth/AuthContext';

export function AccessDenied(): React.ReactElement {
    const { logout } = useAuth();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
            <div className="text-center">
                <h1 className="mb-2 text-2xl font-bold text-white">
                    Access Denied
                </h1>
                <p className="mb-6 text-gray-400">
                    You must be a member of Lusting on Trash to access this
                    site.
                </p>
                <div className="flex items-center justify-center gap-4">
                    <a
                        href="/"
                        className="text-sm text-gray-400 hover:text-white"
                    >
                        Back to home
                    </a>
                    <button
                        onClick={() => void logout()}
                        className="rounded bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}
