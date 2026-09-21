'use client';

import { useCallback, useEffect, useRef } from 'react';

export type ProctorEventType =
  | 'TAB_HIDDEN'
  | 'TAB_VISIBLE'
  | 'WINDOW_BLUR'
  | 'WINDOW_FOCUS'
  | 'FULLSCREEN_EXIT'
  | 'COPY_BLOCKED'
  | 'PASTE_BLOCKED'
  | 'CUT_BLOCKED'
  | 'CONTEXT_MENU_BLOCKED'
  | 'KEYSTROKE'
  | 'FACE_NOT_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'GAZE_AWAY'
  | 'SNAPSHOT';

export interface ProctorEvent {
  type: ProctorEventType;
  timestamp: number;
  key?: string;
  metadata?: Record<string, unknown>;
}

interface ProctorTrackerProps {
  examAttemptId: string;
  children: React.ReactNode;
  onEvent?: (event: ProctorEvent) => void;
  flushIntervalMs?: number;
  ingestUrl?: string;
  authToken?: string;
  enforceFullscreen?: boolean;
}

export default function ProctorTracker({
  examAttemptId,
  children,
  onEvent,
  flushIntervalMs = 4000,
  ingestUrl,
  authToken,
  enforceFullscreen = false,
}: ProctorTrackerProps) {
  const bufferRef = useRef<ProctorEvent[]>([]);

  const record = useCallback(
    (event: ProctorEvent) => {
      bufferRef.current.push(event);
      onEvent?.(event);
    },
    [onEvent]
  );

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0 || !ingestUrl) return;

    const batch = bufferRef.current;
    bufferRef.current = [];

    const payload = JSON.stringify({ examAttemptId, events: batch });

    const sent =
      typeof navigator !== 'undefined' && 'sendBeacon' in navigator
        ? navigator.sendBeacon(ingestUrl, new Blob([payload], { type: 'application/json' }))
        : false;

    if (!sent) {
      fetch(ingestUrl, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: payload,
      }).catch(() => {
        bufferRef.current = [...batch, ...bufferRef.current];
      });
    }
  }, [authToken, examAttemptId, ingestUrl]);

  // Tab & Window Visibility Events
  useEffect(() => {
    const handleVisibilityChange = () => {
      record({ type: document.hidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE', timestamp: Date.now() });
    };
    const handleBlur = () => record({ type: 'WINDOW_BLUR', timestamp: Date.now() });
    const handleFocus = () => record({ type: 'WINDOW_FOCUS', timestamp: Date.now() });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [record]);

  // Fullscreen Tracking
  useEffect(() => {
    if (!enforceFullscreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        record({ type: 'FULLSCREEN_EXIT', timestamp: Date.now() });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enforceFullscreen, record]);

  // Periodic Flush
  useEffect(() => {
    const interval = setInterval(flush, flushIntervalMs);
    window.addEventListener('beforeunload', flush);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [flush, flushIntervalMs]);

  // Clipboard Interception
  const handleCopy = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();
      record({ type: 'COPY_BLOCKED', timestamp: Date.now() });
    },
    [record]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();
      record({ type: 'PASTE_BLOCKED', timestamp: Date.now() });
    },
    [record]
  );

  const handleCut = useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();
      record({ type: 'CUT_BLOCKED', timestamp: Date.now() });
    },
    [record]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      record({ type: 'CONTEXT_MENU_BLOCKED', timestamp: Date.now() });
    },
    [record]
  );

  // Keystroke Logging & Chord Blocking
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isModifierChord = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      // Block devtools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
      if (
        event.key === 'F12' ||
        (isModifierChord && event.shiftKey && (key === 'i' || key === 'j')) ||
        (isModifierChord && key === 'u')
      ) {
        event.preventDefault();
        record({ type: 'CONTEXT_MENU_BLOCKED', timestamp: Date.now(), metadata: { blockedKey: event.key } });
        return;
      }

      if (isModifierChord && (key === 'c' || key === 'v' || key === 'x')) {
        event.preventDefault();
        const type = key === 'c' ? 'COPY_BLOCKED' : key === 'v' ? 'PASTE_BLOCKED' : 'CUT_BLOCKED';
        record({ type, timestamp: Date.now() });
        return;
      }

      record({ type: 'KEYSTROKE', timestamp: Date.now(), key: event.key });
    },
    [record]
  );

  return (
    <div
      onCopy={handleCopy}
      onPaste={handlePaste}
      onCut={handleCut}
      onContextMenu={handleContextMenu}
      onKeyDownCapture={handleKeyDown}
      className="h-full w-full"
    >
      {children}
    </div>
  );
}
