// Generic color-by-threshold engine used by MetricCell and any future ranking
// view. A ColorScheme is a list of stops (descending by min) plus a fallback
// for missing/null values.

export type ColorStop = {
    min: number;
    bg: string;
    text: string;
    ring?: string;
    label?: string;
};

export type ColorScheme = {
    stops: ColorStop[];
    missing: { bg: string; text: string; ring?: string };
};

export function colorFor(
    value: number | null | undefined,
    scheme: ColorScheme
): { bg: string; text: string; ring?: string; label?: string } {
    if (value == null) return scheme.missing;
    for (const stop of scheme.stops) {
        if (value >= stop.min) return stop;
    }
    return scheme.missing;
}
