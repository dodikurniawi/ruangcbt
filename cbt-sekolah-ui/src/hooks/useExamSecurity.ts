'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createViolationDeduper, isFullscreenActive } from '@/lib/examFocus';
import type { ViolationType } from '@/types';

interface UseExamSecurityOptions {
    maxViolations: number;
    onViolation: (type: ViolationType, count: number) => void;
    onMaxViolations: () => void;
    enabled?: boolean;
}

export function useExamSecurity({
    maxViolations,
    onViolation,
    onMaxViolations,
    enabled = true,
}: UseExamSecurityOptions): void {
    const violationsRef = useRef(0);
    const isBlockedRef = useRef(false);
    // Satu tindakan siswa memicu beberapa event; deduper menahan duplikatnya.
    const shouldReportRef = useRef(createViolationDeduper());

    const handleViolation = useCallback((type: ViolationType) => {
        if (!enabled || isBlockedRef.current) return;
        if (!shouldReportRef.current(type, Date.now())) return;

        violationsRef.current += 1;
        const count = violationsRef.current;

        onViolation(type, count);

        if (count >= maxViolations) {
            isBlockedRef.current = true;
            // Delay auto-submit by 10 seconds to show countdown warning
            setTimeout(() => {
                onMaxViolations();
            }, 10000);
        }
    }, [enabled, maxViolations, onViolation, onMaxViolations]);

    useEffect(() => {
        if (!enabled) return;

        // Tab visibility change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation('tab_switch');
            }
        };

        // Keluar dari mode layar penuh saat ujian aktif
        const handleFullscreenChange = () => {
            if (!isFullscreenActive(document)) {
                handleViolation('exit_fullscreen');
            }
        };

        // Window blur (click outside)
        const handleBlur = () => {
            handleViolation('blur');
        };

        // Context menu (right click)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            // Only warning, no strike
        };

        // Keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent Ctrl+C, Ctrl+V, Ctrl+U, F12, Ctrl+Shift+I
            const blockedCombos = [
                e.ctrlKey && e.key === 'c',
                e.ctrlKey && e.key === 'v',
                e.ctrlKey && e.key === 'u',
                e.key === 'F12',
                e.ctrlKey && e.shiftKey && e.key === 'I',
                e.ctrlKey && e.shiftKey && e.key === 'J',
                e.ctrlKey && e.shiftKey && e.key === 'C',
                e.metaKey && e.key === 'c', // Mac
                e.metaKey && e.key === 'v', // Mac
                e.metaKey && e.altKey && e.key === 'i', // Mac DevTools
            ];

            if (blockedCombos.some(Boolean)) {
                e.preventDefault();
                handleViolation('keyboard_shortcut');
            }
        };

        // Copy event
        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            handleViolation('copy');
        };

        // Paste event
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            handleViolation('paste');
        };

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);

        // CSS to prevent text selection
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);

            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
    }, [enabled, handleViolation]);
}
