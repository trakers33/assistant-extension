export default class CommunicationBridge {
    constructor() {
        this.initialize();
    }

    initialize() {
        // Listen for messages from the injector
        window.addEventListener('meet-message', (event) => {
            this.handleMessage(event.detail);
        });
    }

    sendMessage(type, payload) {
        window.postMessage({
            type: 'MEET_EXTENSION',
            payload: {
                type,
                data: payload
            }
        }, '*');
    }

    handleMessage(message) {
        console.log('[InnerScript] handleMessage', message);
        // Handle incoming messages from the injector
        switch (message.type) {
            case 'VIDEO_TOGGLE':
                // Handle video toggle
                break;
            case 'CAPTIONS_TOGGLE':
                // Handle captions toggle
                break;
            case 'START_CAPTURING':
                // Handle media start
                window.ws.enableMediaSending();
                break;
            case 'STOP_CAPTURING':
                // Handle media stop
                window.ws.disableMediaSending();
                break;
            // Add more message handlers as needed
        }
    }
} 