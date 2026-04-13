import { NavLink, Outlet } from 'react-router-dom';

const TABS: Array<{ to: string; label: string }> = [
    { to: 'syncs', label: 'Syncs' },
    { to: 'fights', label: 'Fight Configuration' },
    { to: 'players', label: 'Players' },
];

export function AdminLayout(): React.ReactElement {
    return (
        <div className="flex gap-8">
            <aside className="w-48 shrink-0">
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Admin
                </div>
                <nav className="flex flex-col gap-1">
                    {TABS.map((tab) => (
                        <NavLink
                            key={tab.to}
                            to={tab.to}
                            className={({ isActive }) =>
                                `rounded-md px-3 py-2 text-sm transition-colors ${
                                    isActive
                                        ? 'bg-amber-900/40 text-amber-200 ring-1 ring-amber-700/40'
                                        : 'text-gray-400 hover:bg-gray-900/60 hover:text-white'
                                }`
                            }
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <div className="min-w-0 flex-1">
                <Outlet />
            </div>
        </div>
    );
}
