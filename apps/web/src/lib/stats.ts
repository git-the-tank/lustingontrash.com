export function quantile(sorted: number[], p: number): number {
    const i = (sorted.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return quantile(sorted, 0.5);
}

export function iqr(values: number[]): number | null {
    if (values.length < 3) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return quantile(sorted, 0.75) - quantile(sorted, 0.25);
}
