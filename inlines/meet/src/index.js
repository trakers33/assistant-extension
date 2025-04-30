import * as pako from 'pako';
import UserManager from './lib/UserManager.js';
import CaptionManager from './lib/CaptionManager.js';
import FetchInterceptor from './lib/FetchInterceptor.js';
import RTCInterceptor from './lib/RTCInterceptor.js';
import VideoTrackManager from './lib/VideoTrackManager.js';
import CommunicationBridge from './lib/CommunicationBridge.js';
//import StyleManager from './lib/StyleManager.js';
import { base64ToUint8Array, messageDecoders, parseProtobuf } from './utils/utils.js';
import { MessageDestination, MessageType } from '@extension/shared/lib/types/runtime';

const syncMeetingSpaceCollectionsUrl =
    'https://meet.google.com/$rpc/google.rtc.meetings.v1.MeetingSpaceService/SyncMeetingSpaceCollections';

const scriptTag = document.currentScript;
const extensionId = scriptTag?.getAttribute('data-extension-id');

let _dcid = 50000;
function _getDataChannelID() {
    return ++_dcid;
}

const extractMeetingId = url => {
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    return match ? match[1] : null;
};

function base64ToHex(base64) {
    // Decode base64 to binary string
    const binaryStr = atob(base64);

    // Convert each character to its char code and then to hex
    return Array.from(binaryStr)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}

function smartFlatten(obj, parentKey = '', result = {}, flatKeys = new Set()) {
    for (const key in obj) {
        const value = obj[key];
        const isObject = value && typeof value === 'object' && !Array.isArray(value);
        const flatKey = key;
        const nestedKey = parentKey ? `${parentKey}.${key}` : key;

        if (isObject) {
            smartFlatten(value, nestedKey, result, flatKeys);
        } else {
            if (!flatKeys.has(flatKey)) {
                result[flatKey] = value;
                flatKeys.add(flatKey);
            } else {
                result[nestedKey] = value;
            }
        }
    }

    return result;
}

console.info('>>>> Assistant Google Meet Bot is injected <<<<');

const userManager = new UserManager();
const captionManager = new CaptionManager();
//const styleManager = new StyleManager();
const videoTrackManager = new VideoTrackManager();
window.userManager = userManager;
window.captionManager = captionManager;
window.videoTrackManager = videoTrackManager;
//window.styleManager = styleManager;

const userMap = new Map();

const ws = {
    sendVideo: (currentTimeMicros, firstStreamId, frameWidth, frameHeight, data) => {
        console.log('sendVideo', currentTimeMicros, firstStreamId, frameWidth, frameHeight, data);
    },
    sendAudio: (currentTimeMicros, firstStreamId, audioData) => {
        console.log('sendAudio', currentTimeMicros, firstStreamId, audioData);
        //handleAudioData(audioData, firstStreamId, currentTimeMicros);
    },
    sendJson: json => {
        console.log('sendJson', json);
    },
    enableMediaSending: () => {
        console.log('enableMediaSending');
        //window.styleManager.start();
    },
    disableMediaSending: () => {
        console.log('disableMediaSending');
        //window.styleManager.stop();
    },
};

window.ws = ws;
new FetchInterceptor(async response => {
    if (response.url === syncMeetingSpaceCollectionsUrl) {
        const responseText = await response.text();
        const decodedData = base64ToUint8Array(responseText);

        const userInfoListResponse = messageDecoders['UserInfoListResponse'](decodedData);
        const _flattened = smartFlatten(userInfoListResponse);
        const userInfoList = _flattened?.userInfoList || [];
        if (userInfoList.length > 0) {
            console.log(`\x1b[34m INFO: userInfoList`, userInfoList);
            userManager.newUsersListSynced(userInfoList);
        }
    }
});

const handleCollectionEvent = event => {
    const decodedData = pako.inflate(new Uint8Array(event.data));

    const collectionEvent = messageDecoders['CollectionEvent'](decodedData);

    const deviceOutputInfoList = collectionEvent.body.userInfoListWrapperAndChatWrapperWrapper?.deviceInfoWrapper?.deviceOutputInfoList;
    if (deviceOutputInfoList) {
        console.log(`\x1b[34m INFO: deviceOutputInfoList`, deviceOutputInfoList);
        userManager.updateDeviceOutputs(deviceOutputInfoList);
    }

    const chatMessageWrapper = collectionEvent.body.userInfoListWrapperAndChatWrapperWrapper?.userInfoListWrapperAndChatWrapper?.chatMessageWrapper;
    if (chatMessageWrapper) {
        console.log(`\x1b[34m INFO: chatMessageWrapper`, chatMessageWrapper);
    }

    //console.log('collectionEvent.body.userInfoListWrapperAndChatWrapperWrapper', JSON.stringify(collectionEvent.body.userInfoListWrapperAndChatWrapperWrapper));

    const userInfoList = collectionEvent.body.userInfoListWrapperAndChatWrapperWrapper?.userInfoListWrapperAndChatWrapper?.userInfoListWrapper?.userInfoList || [];
    // This event is triggered when a single user joins (or leaves) the meeting
    // generally this array only contains a single user
    // we can't tell whether the event is a join or leave event, so we'll assume it's a join
    // if it's a leave, then we'll pick it up from the periodic call to syncMeetingSpaceCollections
    // so there will be a lag of roughly a minute for leave events
    for (const user of userInfoList) {
        console.log(`\x1b[34m INFO: user in collection event`, user);
        userManager.singleUserSynced(user);
    }
};

// the stream ID, not the track id in the TRACK appears in the payload of the protobuf message somewhere

const handleCaptionEvent = event => {
    const decodedData = new Uint8Array(event.data);

    const captionWrapper = messageDecoders['CaptionWrapper'](decodedData);
    const caption = captionWrapper.caption;
    captionManager.singleCaptionSynced(caption);
};


/** Launch the interceptor */

new RTCInterceptor({
    onPeerConnectionCreate: peerConnection => {
        peerConnection.addEventListener('datachannel', event => {
            //isInterceptorRunning = true;
            if (event.channel.label == 'collections') {
                event.channel.onmessage = messageEvent => {
                    handleCollectionEvent(messageEvent);
                };
                event.channel.addEventListener('message', messageEvent => {
                    //console.debug('RAWcollectionsevent', messageEvent);
                    handleCollectionEvent(messageEvent);
                });
            }
        });

        peerConnection.addEventListener('track', event => {
            // Log the track and its associated streams
            console.log('New track:', {
                trackId: event.track.id,
                streams: event.streams,
                streamIds: event.streams.map(stream => stream.id),
                // Get any msid information
                transceiver: event.transceiver,
                // Get the RTP parameters which might contain stream IDs
                rtpParameters: event.transceiver?.sender.getParameters(),
            });
            if (event.track.kind === 'audio') {
                //window.styleManager.addAudioTrack(event.track);
            }
            if (event.track.kind === 'video') {
                //window.styleManager.addVideoTrack(event);
            }
        });

        // Log the signaling state changes
        peerConnection.addEventListener('signalingstatechange', () => {
            //console.debug('Signaling State:', peerConnection.signalingState);
        });

        // Log the SDP being exchanged
        const originalSetLocalDescription = peerConnection.setLocalDescription;
        peerConnection.setLocalDescription = function (description) {
            //console.debug('Local SDP:', description);
            return originalSetLocalDescription.apply(this, arguments);
        };

        const originalSetRemoteDescription = peerConnection.setRemoteDescription;
        peerConnection.setRemoteDescription = function (description) {
            //console.debug('Remote SDP:', description);
            return originalSetRemoteDescription.apply(this, arguments);
        };

        // Log ICE candidates
        peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                //console.debug('ICE Candidate:', event.candidate);
            }
        });
    },
    onPeerConnectionClose: async peerConnection => {
        // Save transcript when call ends
        const captions = captionManager.getCaptions();
        if (captions.length > 0) {
            const meetingId = extractMeetingId(window.location.href) || 'default';
            const title = document.title;
            const url = window.location.href;

            // Create a map to track latest versions of captions
            const captionMap = new Map();

            // Process all captions, keeping only the latest version of each
            captions.forEach(caption => {
                const existingCaption = captionMap.get(caption.captionId);
                if (!existingCaption || caption.version > existingCaption.version) {
                    captionMap.set(caption.captionId, caption);
                }
            });

            // Convert map back to array and sort by timestamp
            const mergedCaptions = Array.from(captionMap.values()).sort((a, b) => a.timestamp - b.timestamp);

            const transcript = {
                meetingId,
                title,
                url,
                captions: mergedCaptions,
                createdAt: Date.now(),
            };

            console.log('--> transcript <--', transcript);

            // Send transcript through the persistent connection
            document.documentElement.dispatchEvent(
                new CustomEvent('assistant-message', {
                    detail: {
                        type: MessageType.SAVE_TRANSCRIPT,
                        data: transcript,
                        to: MessageDestination.background,
                    },
                }),
            );
        }
    },
    onDataChannelCreate: (dataChannel, peerConnection) => {
        //console.debug('Channel label ----> ', dataChannel.label);
        if (dataChannel.label === 'collections') {
            dataChannel.addEventListener('message', event => {
                //console.log('collectionsevent', event)
            });
        }

        if (dataChannel.label === 'media-director') {
            dataChannel.addEventListener('message', mediaDirectorEvent => {
                //handleMediaDirectorEvent(mediaDirectorEvent);
            });
        }

        if (dataChannel.label === 'captions') {
            dataChannel.addEventListener('message', captionEvent => {
                handleCaptionEvent(captionEvent);
            });

            const monitorFunc = () => {
                if (dataChannel.readyState === 'closing' || dataChannel.readyState === 'closed') {
                    console.log(
                        'detected closed data channel for captions (eg. someone manually starts and stops the close captioning). Restarting.',
                    );
                    peerConnection.createDataChannel('captions', {
                        ordered: true,
                        maxRetransmits: 10,
                        id: _getDataChannelID(),
                    });
                } else {
                    setTimeout(monitorFunc, 1000);
                }
            };
            monitorFunc();
        }
    },
});

// Initialize communication bridge
const communicationBridge = new CommunicationBridge();

// Add message handler for background script

const port = chrome.runtime.connect({ name: 'script' });

port.onMessage.addListener((message) => {
    console.log('Received message from background:', message);
    
    if (message.type === MessageType.START_CAPTURING) {
        // Reset the state
        userManager.reset();
        captionManager.reset();
        videoTrackManager.reset();

        // Start capturing
        window.transcriptgen = {
            rtc: {
                audioEnabled: true,
                videoEnabled: true,
            },
        };
        
        // Start intercepting audio and video
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        }).then((stream) => {
            stream.getTracks().forEach((track) => {
                if (track.kind === 'audio') {
                    handleAudioTrack({ track, streams: [stream] });
                } else if (track.kind === 'video') {
                    handleVideoTrack({ track, streams: [stream] });
                }
            });
        }).catch((error) => {
            console.error('Error getting media stream:', error);
        });
    }
});

