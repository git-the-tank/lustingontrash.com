import type { ReactElement, ReactNode } from 'react';
import { colorFor, type ColorScheme } from '../../lib/colorScheme';
import { Tooltip } from './Tooltip';

// Generic value cell for any ranking grid. Colored by a ColorScheme,
// optionally wrapped in a tooltip. `value === null` renders the scheme's
// missing state (typically a dash in a muted cell).
export function MetricCell({
    value,
    scheme,
    format,
    tooltip,
    placeholder = '—',
    className = '',
}: {
    value: number | null | undefined;
    scheme: ColorScheme;
    format?: (value: number) => string;
    tooltip?: ReactNode;
    placeholder?: string;
    className?: string;
}): ReactElement {
    const color = colorFor(value, scheme);
    const display =
        value == null ? placeholder : format ? format(value) : String(value);

    const cell = (
        <span
            className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded font-mono text-xs font-semibold tabular-nums ring-1 ${color.bg} ${color.text} ${color.ring ?? ''} ${className}`}
        >
            {display}
        </span>
    );

    if (!tooltip) return cell;
    return <Tooltip content={tooltip}>{cell}</Tooltip>;
}
