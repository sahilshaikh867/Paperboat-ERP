'use client';

import { useEffect, useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5001';

/**
 * Opens a websocket to the backend for real-time submission/test-case
 * updates. `userId` here should be a real authenticated identifier (or the
 * JWT itself, verified server-side on connect) — never trust it as the
 * sole access control.
 */
export function useWebSocket(userId: string | undefined) {
  const socketRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socket = new WebSocket(`${WS_URL}/ws?userId=${encodeURIComponent(userId)}`);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage(event.data);
      }
    };

    return () => socket.close();
  }, [userId]);

  return { isConnected, lastMessage };
}
