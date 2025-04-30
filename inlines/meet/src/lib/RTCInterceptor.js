export default class RTCInterceptor {
    constructor(callbacks) {
        // Store the original RTCPeerConnection
        const originalRTCPeerConnection = window.RTCPeerConnection;

        let isInterceptorRunning = false;

        // Store callbacks
        const onPeerConnectionCreate = callbacks.onPeerConnectionCreate || (() => {});
        const onDataChannelCreate = callbacks.onDataChannelCreate || (() => {});
        const onPeerConnectionClose = callbacks.onPeerConnectionClose || (() => {});

        // Override the RTCPeerConnection constructor
        window.RTCPeerConnection = function (...args) {
            // Create instance using the original constructor
            const peerConnection = Reflect.construct(originalRTCPeerConnection, args);

            // Notify about the creation
            onPeerConnectionCreate(peerConnection);

            // Override createDataChannel
            const originalCreateDataChannel = peerConnection.createDataChannel.bind(peerConnection);
            peerConnection.createDataChannel = (label, options) => {
                isInterceptorRunning = true;
                //console.log('creating data channel', label, options);
                const dataChannel = originalCreateDataChannel(label, options);
                onDataChannelCreate(dataChannel, peerConnection);
                return dataChannel;
            };

            // Override close method
            const originalClose = peerConnection.close.bind(peerConnection);
            peerConnection.close = () => {
                if (isInterceptorRunning) {
                    console.log('closing peer connection', isInterceptorRunning);
                    onPeerConnectionClose(peerConnection);
                }
                return originalClose();
            };

            return peerConnection;
        };
    }
}
