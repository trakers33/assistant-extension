interface Window {
    transcriptgen: {
        rtc?: {
            videoEnabled?: boolean;
        };
    };
}

declare interface CustomEventMap {
    'meet-message': CustomEvent<any>;
    'assistant-message': CustomEvent<any>;
}

declare interface Document {
    addEventListener<K extends keyof CustomEventMap>(
        type: K,
        listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void;
}

declare interface Window {
    addEventListener<K extends keyof CustomEventMap>(
        type: K,
        listener: (this: Window, ev: CustomEventMap[K]) => void
    ): void;
} 