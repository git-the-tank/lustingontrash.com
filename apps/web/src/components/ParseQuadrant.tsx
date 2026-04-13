import { useMemo, type ReactElement } from 'react';
import {
    CartesianGrid,
    Label,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CLASS_COLORS } from '../lib/classColors';
import { median } from '../lib/stats';

export interface QuadrantRow {
    id: string;
    name: string;
    className: string;
    role: string;
    avgPercentile: number;
    spread: number;
    parsedCount: number;
    totalColumns: number;
}

interface ScatterPoint {
    x: number;
    y: number;
    row: QuadrantRow;
}

export interface ParseQuadrantProps {
    rows: QuadrantRow[];
    skippedCount: number;
    onSelect?: (id: string) => void;
}

function quadrantFor(
    point: { x: number; y: number },
    medianAvg: number,
    medianSpread: number
): 'Ace' | 'Steady Floor' | 'Streaky Star' | 'Wildcard' {
    const highPerf = point.x >= medianAvg;
    const tight = point.y <= medianSpread;
    if (highPerf && tight) return 'Ace';
    if (!highPerf && tight) return 'Steady Floor';
    if (highPerf && !tight) return 'Streaky Star';
    return 'Wildcard';
}

function dotRadius(parsedCount: number): number {
    return Math.min(10, 4 + parsedCount / 2);
}

function classColor(className: string): string {
    return CLASS_COLORS[className] ?? '#CCCCCC';
}

export function ParseQuadrant({
    rows,
    skippedCount,
    onSelect,
}: ParseQuadrantProps): ReactElement {
    const { points, medianAvg, medianSpread, maxSpread, topLabels } = useMemo(
        () => buildChartData(rows),
        [rows]
    );

    if (rows.length === 0) {
        return (
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-12 text-center text-gray-500">
                <p>Not enough data to plot.</p>
                <p className="mt-2 text-sm">
                    Each player needs at least 3 parses on the visible bosses.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-xl shadow-black/30">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 px-2">
                <div className="flex items-baseline gap-3 text-xs">
                    <LegendSwatch color="#fbbf24" label="Aces (top-right)" />
                    <LegendSwatch
                        color="#60a5fa"
                        label="Steady Floor (top-left)"
                    />
                    <LegendSwatch
                        color="#f472b6"
                        label="Streaky Star (bottom-right)"
                    />
                    <LegendSwatch
                        color="#9ca3af"
                        label="Wildcard (bottom-left)"
                    />
                </div>
                <div className="text-[11px] text-gray-500">
                    crosshair = group median · dot size = bosses parsed
                </div>
            </div>

            <div className="relative" style={{ minWidth: 640, height: 560 }}>
                <QuadrantLabels />
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                        margin={{ top: 24, right: 32, bottom: 44, left: 40 }}
                    >
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                        >
                            <Label
                                value="Average percentile →"
                                position="bottom"
                                offset={16}
                                fill="#9ca3af"
                                fontSize={12}
                            />
                        </XAxis>
                        <YAxis
                            type="number"
                            dataKey="y"
                            domain={[0, maxSpread]}
                            reversed
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            tickFormatter={(v: number) => v.toFixed(0)}
                        >
                            <Label
                                value="← more consistent    |    spread (IQR)"
                                angle={-90}
                                position="left"
                                offset={16}
                                fill="#9ca3af"
                                fontSize={12}
                                style={{ textAnchor: 'middle' }}
                            />
                        </YAxis>
                        <ReferenceLine
                            x={medianAvg}
                            stroke="#64748b"
                            strokeDasharray="4 4"
                        />
                        <ReferenceLine
                            y={medianSpread}
                            stroke="#64748b"
                            strokeDasharray="4 4"
                        />
                        <Tooltip
                            cursor={{
                                stroke: '#475569',
                                strokeDasharray: '3 3',
                            }}
                            content={(props) => (
                                <QuadrantTooltip
                                    {...props}
                                    medianAvg={medianAvg}
                                    medianSpread={medianSpread}
                                />
                            )}
                        />
                        <Scatter
                            data={points}
                            shape={(props: unknown) => (
                                <DotShape
                                    {...(props as DotShapeProps)}
                                    topLabels={topLabels}
                                    onSelect={onSelect}
                                />
                            )}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {skippedCount > 0 && (
                <div className="mt-3 px-2 text-[11px] text-gray-500">
                    {skippedCount} player{skippedCount === 1 ? '' : 's'} hidden
                    (fewer than 3 parses on visible bosses).
                </div>
            )}
        </div>
    );
}

function buildChartData(rows: QuadrantRow[]): {
    points: ScatterPoint[];
    medianAvg: number;
    medianSpread: number;
    maxSpread: number;
    topLabels: Set<string>;
} {
    const points: ScatterPoint[] = rows.map((row) => ({
        x: row.avgPercentile,
        y: row.spread,
        row,
    }));

    const avgs = points.map((p) => p.x);
    const spreads = points.map((p) => p.y);
    const medianAvg = median(avgs) ?? 50;
    const medianSpread = median(spreads) ?? 0;
    const maxSpreadRaw = spreads.length > 0 ? Math.max(...spreads) : 10;
    const maxSpread = Math.max(10, Math.ceil(maxSpreadRaw / 10) * 10);

    const topLabels = new Set(
        [...rows]
            .sort((a, b) => b.avgPercentile - a.avgPercentile)
            .slice(0, 5)
            .map((r) => r.id)
    );

    return { points, medianAvg, medianSpread, maxSpread, topLabels };
}

function LegendSwatch({
    color,
    label,
}: {
    color: string;
    label: string;
}): ReactElement {
    return (
        <span className="inline-flex items-center gap-1.5 text-gray-400">
            <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
            />
            {label}
        </span>
    );
}

function QuadrantLabels(): ReactElement {
    const base =
        'pointer-events-none absolute rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm';
    return (
        <>
            <div
                className={`${base} border-amber-500/20 bg-amber-500/10 text-amber-300/80`}
                style={{ top: 48, right: 56 }}
            >
                Aces
            </div>
            <div
                className={`${base} border-blue-400/20 bg-blue-500/10 text-blue-300/80`}
                style={{ top: 48, left: 120 }}
            >
                Steady Floor
            </div>
            <div
                className={`${base} border-pink-400/20 bg-pink-500/10 text-pink-300/80`}
                style={{ bottom: 104, right: 56 }}
            >
                Streaky Star
            </div>
            <div
                className={`${base} border-gray-500/20 bg-gray-500/10 text-gray-300/70`}
                style={{ bottom: 104, left: 120 }}
            >
                Wildcard
            </div>
        </>
    );
}

interface DotShapeProps {
    cx?: number;
    cy?: number;
    payload?: ScatterPoint;
}

function DotShape({
    cx,
    cy,
    payload,
    topLabels,
    onSelect,
}: DotShapeProps & {
    topLabels: Set<string>;
    onSelect?: (id: string) => void;
}): ReactElement | null {
    if (cx == null || cy == null || !payload) return null;
    const { row } = payload;
    const r = dotRadius(row.parsedCount);
    const color = classColor(row.className);
    const showLabel = topLabels.has(row.id);
    return (
        <g
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
            onClick={() => onSelect?.(row.id)}
        >
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                fillOpacity={0.85}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
            />
            {showLabel && (
                <text
                    x={cx}
                    y={cy - r - 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize={11}
                    fontWeight={600}
                    style={{ paintOrder: 'stroke' }}
                    stroke="#0b0f19"
                    strokeWidth={3}
                >
                    {row.name}
                </text>
            )}
        </g>
    );
}

interface TooltipPayloadItem {
    payload?: ScatterPoint;
}

function QuadrantTooltip({
    active,
    payload,
    medianAvg,
    medianSpread,
}: {
    active?: boolean;
    payload?: readonly TooltipPayloadItem[];
    medianAvg: number;
    medianSpread: number;
}): ReactElement | null {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    const { row } = point;
    const color = classColor(row.className);
    const q = quadrantFor(
        { x: row.avgPercentile, y: row.spread },
        medianAvg,
        medianSpread
    );
    return (
        <div className="rounded-md border border-gray-700 bg-gray-950/95 p-2.5 text-xs shadow-lg shadow-black/40">
            <div className="font-semibold" style={{ color }}>
                {row.name}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-500">
                {row.className} · {row.role}
            </div>
            <div className="mt-2 space-y-0.5 tabular-nums">
                <Line label="Avg" value={row.avgPercentile.toFixed(1)} />
                <Line label="Spread (IQR)" value={row.spread.toFixed(1)} />
                <Line
                    label="Parsed"
                    value={`${row.parsedCount}/${row.totalColumns}`}
                />
            </div>
            <div className="mt-2 border-t border-gray-800 pt-1.5 text-center text-[11px] text-amber-300">
                {q}
            </div>
        </div>
    );
}

function Line({
    label,
    value,
}: {
    label: string;
    value: string;
}): ReactElement {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-200">{value}</span>
        </div>
    );
}
