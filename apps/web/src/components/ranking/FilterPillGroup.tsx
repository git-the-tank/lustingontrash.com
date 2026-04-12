import type { ReactElement } from 'react';
import { FilterPill } from './FilterPill';

// Labeled row of toggle pills backed by a Set<T>. Each value can be clicked
// to toggle membership in the selection set.
export function FilterPillGroup<T extends string>({
    label,
    values,
    selected,
    onToggle,
    renderLabel,
}: {
    label?: string;
    values: readonly T[];
    selected: Set<T>;
    onToggle: (value: T) => void;
    renderLabel?: (value: T) => string;
}): ReactElement {
    return (
        <div className="flex items-center gap-1.5">
            {label && (
                <span className="mr-1 text-xs text-gray-500">{label}</span>
            )}
            {values.map((value) => (
                <FilterPill
                    key={value}
                    label={renderLabel ? renderLabel(value) : value}
                    active={selected.has(value)}
                    onClick={() => onToggle(value)}
                />
            ))}
        </div>
    );
}
