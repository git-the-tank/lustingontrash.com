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
    // "Show all" state: no pills selected OR every pill selected. Both render
    // as if every pill is active (everything is included). Clicking a pill
    // from this state narrows to just that pill — handled by the parent.
    const isShowAll = selected.size === 0 || selected.size === values.length;
    return (
        <div className="flex items-center gap-1.5">
            {label && (
                <span className="mr-1 text-xs text-gray-500">{label}</span>
            )}
            {values.map((value) => (
                <FilterPill
                    key={value}
                    label={renderLabel ? renderLabel(value) : value}
                    active={isShowAll || selected.has(value)}
                    onClick={() => onToggle(value)}
                />
            ))}
        </div>
    );
}
