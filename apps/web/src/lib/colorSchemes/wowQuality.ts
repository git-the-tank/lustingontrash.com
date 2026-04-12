import type { ColorScheme } from '../colorScheme';

// WoW item-quality thresholds applied to WCL percentiles.
// Stops must be in descending order by `min`.
export const WOW_QUALITY: ColorScheme = {
    stops: [
        {
            min: 95,
            bg: 'bg-[#ff8000]/20',
            text: 'text-[#ff8000]',
            ring: 'ring-[#ff8000]/40',
            label: 'legendary',
        },
        {
            min: 90,
            bg: 'bg-[#a335ee]/20',
            text: 'text-[#c26ffa]',
            ring: 'ring-[#a335ee]/40',
            label: 'epic',
        },
        {
            min: 85,
            bg: 'bg-[#0070ff]/25',
            text: 'text-[#4a9eff]',
            ring: 'ring-[#0070ff]/40',
            label: 'rare',
        },
        {
            min: 80,
            bg: 'bg-[#1eff00]/20',
            text: 'text-[#55e031]',
            ring: 'ring-[#1eff00]/40',
            label: 'uncommon',
        },
        {
            min: 70,
            bg: 'bg-white/10',
            text: 'text-gray-100',
            ring: 'ring-white/20',
            label: 'common',
        },
        {
            min: 0,
            bg: 'bg-[#9d9d9d]/10',
            text: 'text-[#9d9d9d]',
            ring: 'ring-[#9d9d9d]/30',
            label: 'poor',
        },
    ],
    missing: {
        bg: 'bg-gray-900/40',
        text: 'text-gray-700',
        ring: 'ring-gray-800/40',
    },
};
