import { RuntimeMessage } from '@extension/shared/lib/types/runtime';
import { MessageType } from '@extension/shared/lib/types/runtime';
import { getWebSocketConfig } from '@extension/storage/lib/ws-config';
import { insightsMap } from './meeting';
import { MessageDestination } from '@extension/shared/lib/types/runtime';
import { sidePanelPorts } from './ports';

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
                console.log(`[WebSocket][${meetingId}] received message:`, message);
                handleWebSocketMessage(message, meetingId); // Optionally pass a handler
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
    const ws = getWebSocketForMeeting(meetingId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

const handleWebSocketMessage = (message: any, meetingId: string) => {
    // Handle different types of messages from the WebSocket server
    switch (message.type) {
        case 'insight':
            // Update insights
            console.log('handleWebSocketMessage', message);
            const meetingId = message.conversation_id || 'default';
            const currentInsights = insightsMap.get(meetingId) || {
                insights: [],
                currentInsight: 0,
                isInsightsActive: false,
            };
            currentInsights.insights = [...currentInsights.insights, message.data];
            insightsMap.set(meetingId, currentInsights);
            console.log('insightsMap', insightsMap);

            // Notify side panel about new insight
            const insightMessage: RuntimeMessage = {
                type: MessageType.INSIGHTS_UPDATE,
                to: MessageDestination.sidePanel,
                meetingId,
                data: message,
            };
            sidePanelPorts.forEach((port: any) => {
                port.postMessage(insightMessage);
            });
            break;
        // Add more message type handlers as needed
    }
};

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

export function getWebSocketForMeeting(meetingId: string): WebSocket | null {
    return wsConnections.get(meetingId) || null;
}
