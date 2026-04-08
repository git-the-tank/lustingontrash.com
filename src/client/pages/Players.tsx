import { useApi } from '../hooks/useApi';

interface Character {
    id: string;
    name: string;
    server: string;
    className: string;
    guild: {
        name: string;
    };
}

export function Players(): React.ReactElement {
    const { data, isLoading, error } = useApi<Character[]>('/characters');

    if (isLoading) {
        return <p className="text-gray-400">Loading players...</p>;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-gray-400">
                <p>No players synced yet.</p>
                <p className="mt-2 text-sm">
                    POST to /api/sync/characters with your guild info to get
                    started.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="mb-6 text-2xl font-bold">
                {data[0].guild.name} — Players
            </h1>
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-800 text-sm text-gray-400">
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Class</th>
                        <th className="pb-3">Server</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((char) => (
                        <tr
                            key={char.id}
                            className="border-b border-gray-800/50"
                        >
                            <td className="py-3 pr-4 font-medium">
                                {char.name}
                            </td>
                            <td className="py-3 pr-4 text-gray-400">
                                {char.className}
                            </td>
                            <td className="py-3 text-gray-400">
                                {char.server}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
