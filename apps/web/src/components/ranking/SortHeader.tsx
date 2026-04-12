import type { ReactElement, ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export function SortHeader<K extends string>({
    label,
    sortKey,
    currentSort,
    currentDir,
    onSort,
    align = 'left',
}: {
    label: ReactNode;
    sortKey: K;
    currentSort: K;
    currentDir: SortDir;
    onSort: (key: K) => void;
    align?: 'left' | 'center' | 'right';
}): ReactElement {
    const isActive = currentSort === sortKey;
    const justify =
        align === 'center'
            ? 'justify-center'
            : align === 'right'
              ? 'justify-end'
              : '';
    return (
        <button
            onClick={() => onSort(sortKey)}
            className={`group flex w-full items-center gap-1 font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 ${justify}`}
        >
            {label}
            <span
                className={`text-[10px] ${isActive ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-500'}`}
            >
                {isActive ? (currentDir === 'asc' ? '▲' : '▼') : '▲'}
            </span>
        </button>
    );
}
