import * as pako from 'pako';
import { TranscriptMessageWrapper } from './transcriptprotobuf.js';

(function () {
    function getSubArrayIndexV2(haystack, needle, start = 0, skip = -1) {
        outer: for (let i = start; i <= haystack.length - needle.length; ++i) {
            for (let j = 0; j < needle.length; ++j) {
                if (skip === -1 || skip !== j) {
                    if (haystack[i + j] !== needle[j]) {
                        continue outer;
                    }
                }
            }
            return i;
        }
        return -1;
    }

    function isGzip(data) {
        if (!data || data.length < 3) {
            return false;
        }
        return data[0] === 0x1f && data[1] === 0x8b && data[2] === 0x08;
    }

    function unzip(data) {
        const uint8Array = new Uint8Array(data);
        if (isGzip(uint8Array)) {
            return pako.inflate(uint8Array);
        }
        return uint8Array;
    }

    function parseMessageUsingProtobuf(e) {
        let o;
        try {
            let n = TranscriptMessageWrapper.decode(e);
            if (n.unknown2) return {};
            o = n.message;
        } catch {
            return;
        }
        if (o && !(!o.deviceId || !o.messageId || !o.messageVersion || !o.langId))
            return {
                message: {
                    deviceId: `@${o.deviceId}`,
                    messageId: `${o.messageId}/@${o.deviceId}`,
                    messageVersion: typeof o.messageVersion == 'number' ? o.messageVersion : o.messageVersion.low,
                    langId: typeof o.langId == 'number' ? o.langId : o.langId.low,
                    text: o.text || '',
                },
            };
    }

    function parseMessage(a) {
        let b = parseMessageUsingProtobuf(new Uint8Array(a.buffer)); // manu started using protobuf for this
        if (b?.message) {
            return b.message;
        }
        if (b) return;

        // below should not be required as I replaced it with protobuf
        const startMessageId = a.indexOf(16) + 1;
        const boundary =
            [
                getSubArrayIndexV2(a, [24, 0, 32, 1, 45, 0], startMessageId, 1),
                getSubArrayIndexV2(a, [24, 0, 1, 32, 1, 45, 0], startMessageId, 1),
                getSubArrayIndexV2(a, [24, 0, 45, 0], startMessageId, 1),
                getSubArrayIndexV2(a, [24, 0, 1, 45, 0], startMessageId, 1),
            ].find(x => x > -1) ?? -1;
        const afterEndMessageId = boundary > -1 ? boundary : startMessageId + 2;
        const messageIdSlice = a.slice(startMessageId, afterEndMessageId);
        let messageId = 0;
        for (let i = 0; i < messageIdSlice.length; i++) {
            messageId = messageId + messageIdSlice[i] * Math.pow(256, i);
        }
        let textSlice = a.slice(getSubArrayIndexV2(a, [128, 63]) + 4); // structure of the end token: [ 64, LANG_ID, 72 ], where LANG_ID is 1 for English, 2 for Spanish, 4 for Portuguese, 6 for German etc.
        const endToken =
            [getSubArrayIndexV2(textSlice, [64, 0, 72], 0, 1), getSubArrayIndexV2(textSlice, [64, 0, 80], 0, 1)].find(
                G => G > -1,
            ) ?? -1; // "wilcard" match for all languages
        if (endToken === -1) {
            return null;
        }
        const langId = textSlice[endToken + 1];
        textSlice = textSlice.slice(0, endToken);
        const deviceId = new window.TextDecoder().decode(a.slice(3, a.indexOf(16, 4)).buffer).trim();
        const msg = {
            deviceId,
            messageId: `${messageId}/${deviceId}`,
            messageVersion: a[afterEndMessageId + 1],
            langId: langId,
            text: new window.TextDecoder().decode(textSlice.buffer),
        };
        if (msg.deviceId && msg.text && a[afterEndMessageId] !== 24) {
            console.debug('Unexpected Boundary', a);
        }
        return msg.deviceId && msg.text ? msg : null;
    }

    // TODO: Manu to check and replace this with protobuf if possible
    function getDeviceInfo(a) {
        const startDeviceIdRaw = getSubArrayIndexV2(a, [10, 64, 115, 112, 97, 99, 101, 115, 47]);
        if (startDeviceIdRaw === -1) {
            return null;
        }
        const startDeviceId = startDeviceIdRaw + 1;
        const endDeviceId = getSubArrayIndexV2(a, [18], startDeviceId);
        if (endDeviceId === -1) {
            return null;
        }
        const startName = endDeviceId + 2;
        const endName = getSubArrayIndexV2(a, [26], startName);
        if (endName === -1) {
            return null;
        }
        const deviceId = new window.TextDecoder().decode(a.slice(startDeviceId, endDeviceId));
        const deviceName = new window.TextDecoder().decode(a.slice(startName, endName));
        return {
            deviceId,
            deviceName,
        };
    }

    let _dcid = 50000;
    function _getDataChannelID() {
        return ++_dcid;
    }

    let unsentSpeech = [];
    setInterval(() => {
        if (unsentSpeech.length) {
            const toSend = [...unsentSpeech];
            unsentSpeech = [];

            document.documentElement.dispatchEvent(
                new window.CustomEvent('transcriptgen-message', {
                    from: 'content',
                    to: 'background',
                    detail: {
                        type: 'caption',
                        messages: toSend,
                        location: document.location.href,
                    },
                }),
            );
        }
    }, 10);

    function sendSpeechToListener(msg) {
        const previousIndex = unsentSpeech.findIndex(x => x.messageId === msg.messageId);
        if (previousIndex > -1) {
            const prevMsg = unsentSpeech[previousIndex];
            if (prevMsg.messageVersion <= msg.messageVersion) {
                unsentSpeech.splice(previousIndex, 1, msg);
            }
        } else {
            unsentSpeech.push(msg);
        }
    }

    function connectToRTC() {
        if (!window.RTCPeerConnection) {
            return false;
        }

        const origPeerConnection = window.RTCPeerConnection;
        const peerconnection = function (config, constraints) {
            const pc = new origPeerConnection(config, constraints);
            pc.addEventListener('datachannel', function (event) {
                if (event.channel.label === 'collections') {
                    window.transcriptgen.RTCPeerConnection = pc;
                    // when someone new joined or is asking to join
                    event.channel.addEventListener('message', e => {
                        const data = unzip(e.data);
                        const msgDeviceInfo = getDeviceInfo(data);
                        const deviceArr = [];
                        deviceArr.push(msgDeviceInfo);
                        msgDeviceInfo &&
                            document.documentElement.dispatchEvent(
                                new window.CustomEvent('transcriptgen-message', {
                                    from: 'content',
                                    to: 'background',
                                    detail: {
                                        type: 'deviceinfo',
                                        devices: [...deviceArr],
                                        location: document.location.href,
                                    },
                                }),
                            );
                    });
                }
                if (!window.transcriptgen.RTCDataChannel_cc) {
                    window.transcriptgen.RTCDataChannel_cc = window.transcriptgen.RTCPeerConnection.createDataChannel(
                        'captions',
                        {
                            ordered: true,
                            maxRetransmits: 10,
                            id: _getDataChannelID(),
                        },
                    );
                }
            });
            return pc;
        };

        const nativeCreateDataChannel = origPeerConnection.prototype.createDataChannel;
        if (nativeCreateDataChannel) {
            origPeerConnection.prototype.createDataChannel = function () {
                const connection = this;
                const channel = nativeCreateDataChannel.apply(this, arguments);
                if (channel && channel.label === 'captions') {
                    channel.addEventListener('message', e => {
                        const msg = parseMessage(unzip(e.data));
                        msg && sendSpeechToListener(msg);
                        console.log(msg);
                    });
                    const monitorFunc = () => {
                        if (channel.readyState === 'closing' || channel.readyState === 'closed') {
                            console.log(
                                'detected closed data channel for captions (eg. someone manually starts and stops the close captioning). Restarting.',
                            );
                            window.transcriptgen.RTCDataChannel_cc = connection.createDataChannel('captions', {
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
                return channel;
            };
        }
        window.RTCPeerConnection = peerconnection;
        window.RTCPeerConnection.prototype = origPeerConnection.prototype;

        return true;
    }

    if (!window.transcriptgen) window.transcriptgen = {};
    window.transcriptgen.gotRTC = connectToRTC();

    console.log('RTC Connection', window.transcriptgen.gotRTC);

    // this tells us the device name or user's name mapped to a device id
    function parseMeetingSpaceCollection(a) {
        //TODO - Manu to start using protobuf - MeetingCollection MeetingCollectionSub1 MeetingCollectionSub2 BDeviceSub5
        let startRaw = getSubArrayIndexV2(a, [10, 64, 115, 112, 97, 99, 101, 115]);
        if (startRaw === -1) return null;
        const devices = [];
        try {
            while (startRaw > -1) {
                const startDeviceId = startRaw + 1;
                const endDeviceId = getSubArrayIndexV2(a, [18], startDeviceId);
                const startName = endDeviceId + 2;
                const endName = getSubArrayIndexV2(a, [26], startName);
                const deviceId = new window.TextDecoder().decode(a.slice(startDeviceId, endDeviceId));
                const deviceName = new window.TextDecoder().decode(a.slice(startName, endName));
                if (deviceName.indexOf('spaces/') === -1) {
                    devices.push({
                        deviceId,
                        deviceName,
                    });
                }
                const prevStart = startRaw + 1;
                startRaw = getSubArrayIndexV2(a, [10, 64, 115, 112, 97, 99, 101, 115], prevStart);
            }
        } catch (e) {}
        return devices;
    }

    // detect change in transcript or translation language
    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;
    const URLS = {
        modify: 'https://meet.google.com/hangouts/v1_meetings/media_sessions/modify',
    };

    window.XMLHttpRequest.prototype.open = function (method, url) {
        if (url.indexOf(URLS.modify) === 0) {
            this.__transcriptgenRequestUrl = URLS.modify;
        }
        originalOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function (body) {
        if (this.__transcriptgenRequestUrl) {
            try {
                switch (this.__transcriptgenRequestUrl) {
                    case URLS.modify: {
                        const data = JSON.parse(body);
                        const [, , translationLangId, transcriptLangId] = data[3][0][17];
                        console.log(
                            'language changed. translation and transcript = ',
                            translationLangId,
                            transcriptLangId,
                        );
                        document.documentElement.dispatchEvent(
                            new window.CustomEvent('transcriptgen-message', {
                                from: 'content',
                                to: 'background',
                                detail: {
                                    type: 'language-changed',
                                    location: document.location.href,
                                    payload: {
                                        translationLangId,
                                        transcriptLangId,
                                    },
                                },
                            }),
                        );
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        originalSend.apply(this, arguments);
    };

    const FETCH = window.fetch;
    window.fetch = function () {
        return new Promise((resolve, reject) => {
            FETCH.apply(this, arguments)
                .then(res => {
                    try {
                        if (
                            res.url ===
                            'https://meet.google.com/$rpc/google.rtc.meetings.v1.MeetingSpaceService/SyncMeetingSpaceCollections'
                        ) {
                            const clonedRes = res.clone();
                            clonedRes
                                .text()
                                .then(bodyText => {
                                    const a = Uint8Array.from(window.atob(bodyText), c => c.charCodeAt(0));
                                    const devices = parseMeetingSpaceCollection(a);
                                    console.log('premeeting-devices ', devices);
                                    devices &&
                                        document.documentElement.dispatchEvent(
                                            new window.CustomEvent('transcriptgen-message', {
                                                from: 'content',
                                                to: 'background',
                                                detail: {
                                                    type: 'premeeting-devices',
                                                    devices: [...devices],
                                                    location: document.location.href,
                                                },
                                            }),
                                        );
                                })
                                .catch(e => console.log(e));
                        }
                    } catch (e) {}
                    resolve(res);
                })
                .catch(error => {
                    reject(error);
                });
        });
    };
})();
