import { MessageDestination } from '@extension/shared/lib/types/runtime';

export default class CaptionManager {
    constructor() {
        this.captions = new Map();
        this.captionHistory = [];
        this.lastProcessedTimestamp = 0;
    }

    reset() {
        this.captions.clear();
        this.captionHistory = [];
        this.lastProcessedTimestamp = 0;
    }

    singleCaptionSynced(caption) {
        // Get speaker name from user manager if available
        // Create enhanced caption with speaker info
        const enhancedCaption = {
            ...caption,
            speaker: window.userManager?.getUserByDeviceId(caption.deviceId) || null,
            timestamp: Date.now(),
            captionHeader: {
                timestamp: caption?.captionHeader?.timestamp || null
            },
        };

        // Store in both the Map and history array
        this.captions.set(caption.captionId, enhancedCaption);
        this.captionHistory.push(enhancedCaption);

        // Update last processed timestamp
        this.lastProcessedTimestamp = Date.now();

        console.log(`\x1b[34m INFO: CaptionManager -> singleCaptionSynced`, enhancedCaption);

        // Send caption update to background script
        document.documentElement.dispatchEvent(
            new CustomEvent('assistant-message', {
                detail: {
                    type: 'CAPTIONS_UPDATE',
                    data: [enhancedCaption],
                    from: MessageDestination.inline,
                    to: MessageDestination.sidePanel,
                },
            }),
        );
    }

    // Get all captions since a specific timestamp
    getCaptionsSince(timestamp) {
        return this.captionHistory.filter(caption => caption.timestamp > timestamp);
    }

    getCaptions() {
        return this.captionHistory;
    }

    // Rebuild and send all captions since a specific timestamp
    rebuildCaptionsSince(timestamp) {
        const recentCaptions = this.getCaptionsSince(timestamp);
        if (recentCaptions.length > 0) {
            document.documentElement.dispatchEvent(
                new CustomEvent('assistant-message', {
                    detail: {
                        type: 'CAPTIONS_UPDATE',
                        data: recentCaptions,
                        from: MessageDestination.inline,
                        to: MessageDestination.sidePanel,
                    },
                }),
            );
        }
        return recentCaptions;
    }

    // Handle reconnection by sending all captions since last processed timestamp
    handleReconnection() {
        return this.rebuildCaptionsSince(this.lastProcessedTimestamp);
    }

    // Clear old captions to prevent memory issues
    clearOldCaptions(maxAge = 3600000) {
        // Default 1 hour
        const cutoffTime = Date.now() - maxAge;
        this.captionHistory = this.captionHistory.filter(caption => caption.timestamp > cutoffTime);

        // Also clean up the Map
        for (const [id, caption] of this.captions.entries()) {
            if (caption.timestamp < cutoffTime) {
                this.captions.delete(id);
            }
        }
    }
}
