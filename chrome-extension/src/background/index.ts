//import { runtime, browserAction, storage, tabs, Tabs } from 'webextension-polyfill';
import { RuntimeMessage, MessageDestination, MessageSource, MessageType } from '@extension/shared/lib/types/runtime';
import { CaptionData, Participant } from '@extension/shared/lib/types/meeting';
import { runtime, storage } from 'webextension-polyfill';
import {  transcriptStorage, addTranscript } from '@extension/storage';
import { getWebSocketConfig, WebSocketConfig } from '@extension/storage/lib/ws-config';

const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

// Initialize separate state maps for each data type
const participantsMap = new Map<string, Participant[]>();
const captionsMap = new Map<string, CaptionData[]>();
const meetingInfoMap = new Map<string, { title: string; url: string }>();
const insightsMap = new Map<string, { insights: any[]; currentInsight: number; isInsightsActive: boolean }>();

// Store the last known ports
let inlinePorts = new Set<chrome.runtime.Port>();
let sidePanelPorts = new Set<chrome.runtime.Port>();
let scriptPorts = new Set<chrome.runtime.Port>();

// WebSocket connection state
let wsConnection: WebSocket | null = null;
let wsReconnectTimeout: NodeJS.Timeout | null = null;

// Helper to get or generate a persistent random user_id for the extension user
function generateUUIDv4() {
    // https://stackoverflow.com/a/2117523/508355
    return 'user-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function getOrCreateUserId(): Promise<string> {
    const key = 'wsUserId';
    const result = await chrome.storage.local.get(key);
    if (result[key]) {
        return result[key];
    }
    // Generate a random user_id (UUID v4 style)
    const randomId = generateUUIDv4();
    await chrome.storage.local.set({ [key]: randomId });
    return randomId;
}

// Function to initialize WebSocket connection
const initWebSocket = async () => {
    const config = await getWebSocketConfig();
    console.log('initWebSocket', config);
    if (!config.enabled || !config.endpoint) {
        if (wsConnection) {
            wsConnection.close();
            wsConnection = null;
        }
        return;
    }

    if (wsConnection) {
        wsConnection.close();
    }

    // Dynamically build the endpoint
    // Use the most recent meetingId in state, or fallback
    const meetingIds = Array.from(participantsMap.keys());
    const meetingId = meetingIds.length > 0 ? meetingIds[0] : 'default-conv';
    const user_id = 'default_user_id';//await getOrCreateUserId();
    const conversation_id = meetingId || 'default-conv';
    let endpoint = config.endpoint;
    if (!endpoint.endsWith('/')) endpoint += '/';
    endpoint = `${endpoint}${user_id}/${conversation_id}`;
    console.log('initWebSocket', endpoint);
    try {
        wsConnection = new WebSocket(endpoint);

        wsConnection.onopen = () => {
            console.log('WebSocket connection established');
            if (wsReconnectTimeout) {
                clearTimeout(wsReconnectTimeout);
                wsReconnectTimeout = null;
            }
        };

        wsConnection.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('WebSocket message received', message);
                handleWebSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        wsConnection.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsConnection.onclose = () => {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after 5 seconds
            wsReconnectTimeout = setTimeout(initWebSocket, 5000);
        };
    } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
    }
};

// Function to handle incoming WebSocket messages
const handleWebSocketMessage = (message: any) => {
    // Handle different types of messages from the WebSocket server
    switch (message.type) {
        case 'insight':
            // Update insights
            const meetingId = message.meetingId || 'default';
            const currentInsights = insightsMap.get(meetingId) || { insights: [], currentInsight: 0, isInsightsActive: false };
            currentInsights.insights = [...currentInsights.insights, message.data];
            insightsMap.set(meetingId, currentInsights);
            
            // Notify side panel about new insight
            const insightMessage: RuntimeMessage = {
                type: MessageType.INSIGHTS_UPDATE,
                to: MessageDestination.sidePanel,
                meetingId,
                data: currentInsights,
            };
            sidePanelPorts.forEach(port => {
                port.postMessage({
                    type: MessageType.MEETING_INFO,
                    to: MessageDestination.sidePanel,
                    meetingId,
                    data: {
                        participants: participantsMap.get(meetingId) || [],
                        captions: captionsMap.get(meetingId) || [],
                        insights: insightsMap.get(meetingId) || { insights: [], currentInsight: 0, isInsightsActive: false },
                        ...(meetingInfoMap.get(meetingId) || { title: '', url: '' }),
                    },
                });
            });
            break;
        // Add more message type handlers as needed
    }
};

// Function to stream captions to WebSocket
const streamCaptions = async (caption: CaptionData, meetingId: string) => {
    console.log('streamCaptions', wsConnection);
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        //const user_id = await getOrCreateUserId();
        // Use meetingId as conversation_id
        //const conversation_id = meetingId;
        // Compose the message in the required format
        console.log('streamCaptions', caption);
        const payload = {
            text: caption.text,
            speaker: caption.deviceId || caption.speakerName //|| user_id,
            //user_id,
            //conversation_id,
        };
        //wsConnection.send(JSON.stringify(payload));
    }
};

// Function to update state based on message type
const updateState = (message: RuntimeMessage) => {
    const meetingId = message?.meetingId || 'default';

    //console.log('Updating state', message);

    switch (message.type) {
        case MessageType.START_CAPTURING:
            console.log('START_CAPTURING', meetingId);
            // Reset all maps for this meeting
            participantsMap.set(meetingId, []);
            captionsMap.set(meetingId, []);
            meetingInfoMap.set(meetingId, { title: '', url: '' });
            insightsMap.set(meetingId, { insights: [], currentInsight: 0, isInsightsActive: false });

            // Start tab and mic capture, merge audio, combine with video, and set up WebRTC streaming
            break;
        case MessageType.USERS_UPDATE:
            if (message.data) {
                const { newUsers, removedUsers, updatedUsers } = message.data;
                const currentParticipants = participantsMap.get(meetingId) || [];
                
                // Update participants
                let updatedParticipants = currentParticipants
                    .filter(p => !removedUsers.some((ru: any) => ru.deviceId === p.deviceId))
                    .map(p => {
                        const updatedUser = updatedUsers.find(
                            (u: any) => u.deviceId === p.deviceId || u.profilePicture === p.profilePicture,
                        );
                        return updatedUser || p;
                    });
                
                // Add new users
                updatedParticipants = [...updatedParticipants, ...newUsers].filter(
                    (p: any, index: number, self: any[]) =>
                        index === self.findIndex((t: any) => t.deviceId === p.deviceId),
                );

                participantsMap.set(meetingId, updatedParticipants);
            }
            break;
        case MessageType.CAPTIONS_UPDATE:
            if (message.data) {
                const newCaptions = message.data;
                const currentCaptions = captionsMap.get(meetingId) || [];
                const captionMap = new Map<number, CaptionData>();

                // First add all existing captions to the map
                currentCaptions.forEach(caption => {
                    captionMap.set(caption.captionId, caption);
                });

                // Then update with new captions, keeping only the latest version
                newCaptions.forEach((newCaption: CaptionData) => {
                    const existingCaption = captionMap.get(newCaption.captionId);
                    if (!existingCaption || newCaption.version > existingCaption.version) {
                        captionMap.set(newCaption.captionId, newCaption);
                        // Stream new/updated captions to WebSocket
                        streamCaptions(newCaption, meetingId);
                    }
                });

                // Convert back to array and sort by timestamp
                const updatedCaptions = Array.from(captionMap.values()).sort((a, b) => a.timestamp - b.timestamp);
                captionsMap.set(meetingId, updatedCaptions);
            }
            break;
        case MessageType.INSIGHTS_UPDATE:
            if (message.data) {
                insightsMap.set(meetingId, message.data);
            }
            break;
        case MessageType.MEETING_INFO:
            if (message.data) {
                meetingInfoMap.set(meetingId, message.data);
            }
            break;
        case MessageType.TOGGLE:
            // ... existing code ...
            break;
        case MessageType.SAVE_TRANSCRIPT:
            // ... existing code ...
            break;
        default:
            // ... existing code ...
            break;
    }
};

// Listen for connections from the inline panel
chrome.runtime.onConnect.addListener(async (port: chrome.runtime.Port) => {
    if (port.name === MessageSource.inline) {
        inlinePorts.add(port);

        // Handle disconnection
        port.onDisconnect.addListener(() => {
            inlinePorts.delete(port);
        });
    } else if (port.name === MessageSource.sidePanel) {
        sidePanelPorts.add(port);

        // Handle disconnection
        port.onDisconnect.addListener(() => {
            sidePanelPorts.delete(port);
            console.error('Side panel port disconnected');
        });
    } else if (port.name === 'script') {
        scriptPorts.add(port);

        // Handle messages from the script
        port.onMessage.addListener((message: RuntimeMessage) => {
            console.log('\x1b[32m%s\x1b[0m', 'message -> script port', message);
            if (message.to === MessageDestination.background && message.type === MessageType.SAVE_TRANSCRIPT) {
                addTranscript(message.data)
                    .then(() => {
                        port.postMessage({ success: true });
                    })
                    .catch((error: Error) => {
                        console.error('Error saving transcript:', error);
                        port.postMessage({ success: false, error: error.message });
                    });
            }
        });

        // Handle disconnection
        port.onDisconnect.addListener(() => {
            scriptPorts.delete(port);
            console.log('Script port disconnected');
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
    if (tab.id) {
        // Send message to toggle the side panel
        const message: RuntimeMessage = {
            to: MessageDestination.inline,
            type: MessageType.TOGGLE,
            data: null,
        };

        inlinePorts.forEach(port => {
            console.log('Sending message to inline port');
            port.postMessage(message);
        });
    }
});

// Function to check if a message type is a state update type
const isStateUpdateType = (type: MessageType): boolean => {
    return [
        MessageType.USERS_UPDATE,
        MessageType.CAPTIONS_UPDATE,
        MessageType.INSIGHTS_UPDATE,
        MessageType.MEETING_INFO,
        MessageType.START_CAPTURING,
    ].includes(type);
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(async (message: RuntimeMessage, sender, sendResponse) => {
    //console.log('Background received message', message);
    const meetingId = message?.meetingId || 'default';
    // Update state based on message
    if (isStateUpdateType(message.type)) {
        updateState(message);
    }

    // Handle specific message types
    switch (message.type) {
        case MessageType.SAVE_TRANSCRIPT:
            addTranscript(message.data)
                .then(() => sendResponse({ success: true }))
                .catch((error: Error) => {
                    console.error('Error saving transcript:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return; // Required for async response
        case MessageType.USERS_UPDATE:
            // Handle users update exception
            message.data = {
                participants: participantsMap.get(meetingId) || [],
            };
            break;
        default:
            break;
    }

    // Forward message to appropriate port
    switch (message.to) {
        case MessageDestination.inline:
            console.log('Sending message to inline port', message);
            inlinePorts.forEach(port => port.postMessage(message));
            break;
        case MessageDestination.sidePanel:
            console.log('Sending message to side panel port', message);
            sidePanelPorts.forEach(port => port.postMessage(message));
            break;
        case MessageDestination.script:
            console.log('Sending message to script port', message);
            scriptPorts.forEach(port => port.postMessage(message));
            break;
        default:
            console.error('Unknown message destination', message.to);   
    }
});

export async function init() {
    initWebSocket();
}

// Execute init when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    init().then(() => {
        console.log('[background] loaded');
    });
});

// Listen for storage changes to update WebSocket connection
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.wsConfig) {
        initWebSocket();
    }
});
