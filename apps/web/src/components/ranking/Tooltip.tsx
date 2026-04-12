import { useState, useRef, type ReactElement, type ReactNode } from 'react';

// Lightweight hover tooltip — absolute-positioned, no portal, no library.
// Shows `content` when the trigger element is hovered or focused. Positioned
// above the trigger with a small arrow.
export function Tooltip({
    children,
    content,
    disabled,
}: {
    children: ReactNode;
    content: ReactNode;
    disabled?: boolean;
}): ReactElement {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function show(): void {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setOpen(true);
    }

    function hide(): void {
        // Delay so moving from trigger into the tooltip doesn't flicker.
        // The tooltip itself also calls show/hide so the user can hover
        // into it and click links (e.g., the WCL deep link).
        closeTimer.current = setTimeout(() => setOpen(false), 100);
    }

    if (disabled || !content) {
        return <>{children}</>;
    }

    return (
        <span
            className="relative inline-block"
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children}
            {open && (
                <span
                    role="tooltip"
                    onMouseEnter={show}
                    onMouseLeave={hide}
                    className="absolute bottom-full left-1/2 z-50 mb-2 min-w-[14rem] -translate-x-1/2 rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-left text-xs text-gray-200 shadow-xl shadow-black/60"
                >
                    {content}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                </span>
            )}
        </span>
    );
}
