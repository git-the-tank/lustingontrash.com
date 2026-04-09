import { useAuth } from '../auth/AuthContext';

export function Login(): React.ReactElement {
    const { login } = useAuth();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
            <div className="text-center">
                <h1 className="mb-2 text-3xl font-bold text-white">
                    Lusting on Trash
                </h1>
                <p className="mb-8 text-gray-400">
                    Guild members only. Log in with your Battle.net account.
                </p>
                <button
                    onClick={login}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                    Log in with Battle.net
                </button>
            </div>
        </div>
    );
}
