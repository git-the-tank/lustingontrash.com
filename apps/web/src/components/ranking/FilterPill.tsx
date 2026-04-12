import type { ReactElement, ReactNode } from 'react';

export function FilterPill({
    label,
    active,
    onClick,
    title,
}: {
    label: ReactNode;
    active: boolean;
    onClick: () => void;
    title?: string;
}): ReactElement {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                    ? 'bg-amber-900/60 text-amber-200 ring-1 ring-amber-700/50'
                    : 'bg-gray-800/60 text-gray-400 ring-1 ring-gray-700/40 hover:bg-gray-800 hover:text-gray-300'
            }`}
        >
            {label}
        </button>
    );
}
