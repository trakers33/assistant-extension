// Next.js Edge API Route for WebRTC Signaling
// Place this file in your Next.js app directory under /app/api/signal/route.ts
// This is a simple in-memory signaling server for demo/dev purposes only.
// For production, use a persistent signaling server.

import { NextRequest } from 'next/server';

// In-memory room state (not suitable for production)
const rooms: Record<string, { broadcaster?: WebSocket; viewer?: WebSocket }> = {};

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);

  let roomId: string | null = null;
  let role: 'broadcaster' | 'viewer' | null = null;

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'join') {
        roomId = msg.roomId;
        role = msg.role;
        if (!roomId || !role) {
          socket.send(JSON.stringify({ error: 'Missing roomId or role' }));
          return;
        }
        if (!rooms[roomId]) rooms[roomId] = {};
        rooms[roomId][role] = socket;
        socket.send(JSON.stringify({ joined: true, role, roomId }));
      } else if (msg.type === 'signal' && roomId && role) {
        // Relay signaling messages to the other peer
        const otherRole = role === 'broadcaster' ? 'viewer' : 'broadcaster';
        const otherSocket = rooms[roomId][otherRole];
        if (otherSocket) {
          otherSocket.send(JSON.stringify({ type: 'signal', data: msg.data, from: role }));
        }
      }
    } catch (e) {
      socket.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  };

  socket.onclose = () => {
    if (roomId && role && rooms[roomId]) {
      rooms[roomId][role] = undefined;
      // Optionally clean up empty rooms
      if (!rooms[roomId].broadcaster && !rooms[roomId].viewer) {
        delete rooms[roomId];
      }
    }
  };

  return response;
} 