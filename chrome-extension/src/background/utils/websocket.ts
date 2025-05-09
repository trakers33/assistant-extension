import { getWebSocketConfig } from '@extension/storage/lib/ws-config';

// Map of meetingId to WebSocket connection
const wsConnections: Map<string, WebSocket> = new Map();
const wsReconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

export async function getOrCreateWebSocketForMeeting(meetingId: string, user_id: string): Promise<WebSocket | null> {
    const config = await getWebSocketConfig();
    if (!config.enabled || !config.endpoint) {
        return null;
    }
    if (wsConnections.has(meetingId)) {
        return wsConnections.get(meetingId)!;
    }
    let endpoint = config.endpoint;
    if (!endpoint.endsWith('/')) endpoint += '/';
    endpoint = `${endpoint}${user_id}/${meetingId}`;
    try {
        const ws = new WebSocket(endpoint);
        wsConnections.set(meetingId, ws);

        ws.onopen = () => {
            console.log(`[WebSocket][${meetingId}] connection established`);
            const timeout = wsReconnectTimeouts.get(meetingId);
            if (timeout) {
                clearTimeout(timeout);
                wsReconnectTimeouts.delete(meetingId);
            }
        };

        ws.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                // handleWebSocketMessage(message, meetingId); // Optionally pass a handler
            } catch (error) {
                console.error(`[WebSocket][${meetingId}] Error parsing message:`, error);
            }
        };

        ws.onerror = error => {
            console.error(`[WebSocket][${meetingId}] WebSocket error:`, error);
        };

        ws.onclose = () => {
            console.log(`[WebSocket][${meetingId}] connection closed`);
            wsConnections.delete(meetingId);
            // Attempt to reconnect after 5 seconds
            const timeout = setTimeout(() => {
                getOrCreateWebSocketForMeeting(meetingId, user_id);
            }, 5000);
            wsReconnectTimeouts.set(meetingId, timeout);
        };
        return ws;
    } catch (error) {
        console.error(`[WebSocket][${meetingId}] Error establishing connection:`, error);
        return null;
    }
}

export function sendWebSocketMessageForMeeting(meetingId: string, user_id: string, data: any) {
    getOrCreateWebSocketForMeeting(meetingId, user_id).then(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    });
}

// Optionally, export a cleanup function
export function closeWebSocketForMeeting(meetingId: string) {
    const ws = wsConnections.get(meetingId);
    if (ws) {
        ws.close();
        wsConnections.delete(meetingId);
    }
    const timeout = wsReconnectTimeouts.get(meetingId);
    if (timeout) {
        clearTimeout(timeout);
        wsReconnectTimeouts.delete(meetingId);
    }
}
