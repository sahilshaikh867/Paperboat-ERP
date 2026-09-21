import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

interface ClientMeta {
  userId: string;
}

const clients = new Map<WebSocket, ClientMeta>();

/**
 * Attaches a `ws` server to the existing HTTP server on the `/ws` path.
 * Clients connect with `?userId=<id>` (in production, prefer validating a
 * short-lived signed token here instead of trusting a bare query param).
 */
export function initWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    const userId = url.searchParams.get('userId');

    if (!userId) {
      socket.close(4001, 'Missing userId');
      return;
    }

    clients.set(socket, { userId });
    socket.on('close', () => clients.delete(socket));
  });
}

/** Pushes a JSON payload to every open socket belonging to a given user. */
export function notifyUser(userId: string, payload: unknown): void {
  const message = JSON.stringify(payload);
  for (const [socket, meta] of clients.entries()) {
    if (meta.userId === userId && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}
