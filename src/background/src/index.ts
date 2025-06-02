//import { runtime, browserAction, storage, tabs, Tabs } from 'webextension-polyfill';
import { RuntimeMessage, MessageDestination, MessageSource, MessageType } from '@extension/shared/lib/types/runtime';
import { CaptionData, Participant } from '@extension/shared/lib/types/meeting';
import { transcriptStorage, addTranscript } from '@extension/storage';
import { getWebSocketConfig, WebSocketConfig } from '@extension/storage/lib/ws-config';
import { getProfiles, optionsStorage, getAutoMerge } from '@extension/storage/lib/impl/optionsStorage';
import { setupKeepAlive } from './utils/keepAlive';
import { getOrCreateWebSocketForMeeting, closeWebSocketForMeeting } from './utils/websocket';
import { setupSidePanelBehavior } from './utils/sidePanel';
import { setupTabListeners } from './utils/tab';
import { openai } from './utils/openai';
import {
    getParticipants,
    setParticipants,
    getCaptions,
    setCaptions,
    addCaption,
    getMeetingInfo,
    setMeetingInfo,
    getInsights,
    setInsights,
    resetMeeting,
    clearMeeting,
    handleCaptionsUpdate,
} from './utils/meeting';
import { inlinePorts, sidePanelPorts, scriptPorts, optionPorts } from './utils/ports';

// Track which tabs have the side panel open
const openSidePanelTabs = new Set<number>();

// Function to update state based on message type
const updateState = (message: RuntimeMessage) => {
    const meetingId = message?.meetingId || 'default';

    //console.log('Updating state', message);

    switch (message.type) {
        case MessageType.START_CAPTURING:
            console.log('START_CAPTURING', meetingId);
            // Reset all maps for this meeting
            resetMeeting(meetingId);

            // Start tab and mic capture, merge audio, combine with video, and set up WebRTC streaming
            break;
        case MessageType.USERS_UPDATE:
            if (message.data) {
                const { newUsers, removedUsers, updatedUsers } = message.data;
                const currentParticipants = getParticipants(meetingId) || [];

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

                setParticipants(meetingId, updatedParticipants);
            }
            break;
        case MessageType.CAPTIONS_UPDATE:
            if (message.data) {
                handleCaptionsUpdate(meetingId, message.data);
            }
            break;
        case MessageType.INSIGHTS_UPDATE:
            if (message.data) {
                console.log('INSIGHTS_UPDATE', message.data);
                setInsights(meetingId, message.data);
            }
            break;
        case MessageType.MEETING_INFO:
            if (message.data) {
                setMeetingInfo(meetingId, message.data);
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
    } else if (port.name === MessageSource.script) {
        scriptPorts.add(port);

        // Handle messages from the script
        port.onMessage.addListener((message: RuntimeMessage) => {
            console.log('\x1b[32m%s\x1b[0m', 'message -> script port', message);
            if (message.to === MessageDestination.background && message.type === MessageType.SAVE_TRANSCRIPT) {
                getAutoMerge().then(autoMerge => {
                    addTranscript(message.data, autoMerge)
                        .then(() => {
                            port.postMessage({ success: true });
                        })
                        .catch((error: Error) => {
                            console.error('Error saving transcript:', error);
                            port.postMessage({ success: false, error: error.message });
                        });
                });
            }
        });

        // Handle disconnection
        port.onDisconnect.addListener(() => {
            scriptPorts.delete(port);
            console.log('Script port disconnected');
        });
    } else if (port.name === MessageSource.option) {
        optionPorts.add(port);

        // Handle disconnection
        port.onDisconnect.addListener(() => {
            optionPorts.delete(port);
            console.log('Option port disconnected');
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
chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    const processMessage = async (message: RuntimeMessage, sendResponse: (response: any) => void) => {
        console.log('Background received message', message);
        //console.log('Background received message', message);
        const meetingId = message?.meetingId || 'default';
        // Update state based on message
        if (isStateUpdateType(message.type)) {
            updateState(message);
        }

        // Handle specific message types
        switch (message.type) {
            case MessageType.OPEN_SIDE_PANEL:
                if (sender.tab && sender.tab.id) {
                    openSidePanelTabs.add(sender.tab.id);
                    chrome.sidePanel.open({ tabId: sender.tab.id });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ error: 'No tab ID available' });
                }
                break;
            case MessageType.SAVE_TRANSCRIPT:
                getAutoMerge().then(autoMerge => {
                    addTranscript(message.data, autoMerge)
                        .then(() => sendResponse({ success: true }))
                        .catch((error: Error) => {
                            console.error('Error saving transcript:', error);
                            sendResponse({ success: false, error: error.message });
                        });
                });
                break; // Required for async response
            case MessageType.USERS_UPDATE:
                // Handle users update exception
                message.data = {
                    participants: getParticipants(meetingId) || [],
                };
                break;
            case MessageType.REQUEST_GENERATE_SUMMARY:
                console.log('REQUEST_GENERATE_SUMMARY', message);
                // Handle generate summary exception
                const { captions, instruction, profile } = message.data;
                // Fetch OpenAI key from storage

                // Call OpenAI API with outputSchema (strict JSON schema)
                const result = await openai.generateSummary({
                    captions,
                    instruction,
                    profile,
                });
                if (result.error) {
                    sendResponse({ error: result.error });
                    break;
                }
                sendResponse({ summary: result.summary, actionItems: result.actionItems });
                break;
            case MessageType.TOGGLE_INSIGHTS:
                const { enabled, meetingId: msgMeetingId, user_id } = message.data;
                if (enabled) {
                    getOrCreateWebSocketForMeeting(msgMeetingId, user_id);
                } else {
                    closeWebSocketForMeeting(msgMeetingId);
                }
                sendResponse({ success: true });
                break;
            case MessageType.GET_PARTICIPANTS:
                const participants = getParticipants(meetingId);
                sendResponse({ participants });
                return true; // Indicates async response
            case MessageType.GET_CAPTIONS:
                const captions2 = getCaptions(meetingId);
                sendResponse({ captions: captions2 });
                return true; // Indicates async response
            default:
                break;
        }

        // Forward message to appropriate port
        switch (message.to) {
            case MessageDestination.inline:
                //console.log('Sending message to inline port', message);
                inlinePorts.forEach(port => port.postMessage(message));
                break;
            case MessageDestination.sidePanel:
                //console.log('Sending message to side panel port', message);
                sidePanelPorts.forEach(port => port.postMessage(message));
                break;
            case MessageDestination.script:
                //console.log('Sending message to script port', message);
                scriptPorts.forEach(port => port.postMessage(message));
                break;
            case MessageDestination.option:
                //console.log('Sending message to option port', message);
                optionPorts.forEach(port => port.postMessage(message));
                break;
            default:
                console.error('Unknown message destination', message.to);
        }
    };

    processMessage(message, sendResponse);

    return true;
});

// Unified initialization function
async function init() {
    setupKeepAlive();
    setupSidePanelBehavior();
    setupTabListeners();
    //initWebSocket({ meetingId: 'default-conv', user_id: 'default_user_id' });
}

// Execute init when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('[extension] Installed');
});

// Also call init on startup
init();

// Listen for storage changes to update WebSocket connection
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.wsConfig) {
        //initWebSocket();
    }
});
