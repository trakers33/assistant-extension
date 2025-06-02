export class TranscriptionDisplay {
    private element: HTMLDivElement;
    private isVisible: boolean = true;

    constructor() {
        this.element = document.createElement('div');
        this.element.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            max-width: 300px;
            z-index: 10000;
            animation: fadeIn 0.5s ease-in-out;
            display: none;
        `;
    }

    public mount() {
        document.body.appendChild(this.element);
    }

    public updateTranscription(transcript: string, timestamp: string) {
        if (this.isVisible) {
            this.element.innerHTML = `
                <div class="transcription-text" style="margin-bottom: 8px;">
                    ${transcript}
                </div>
                <div class="transcription-time" style="font-size: 0.8em; opacity: 0.7; float: right;">
                    ${new Date(timestamp).toLocaleTimeString()}
                </div>
            `;
        }
    }

    public setVisible(isVisible: boolean) {
        this.isVisible = isVisible;
        this.element.style.display = isVisible ? 'block' : 'none';
    }

    public isCurrentlyVisible(): boolean {
        return this.isVisible;
    }
}
