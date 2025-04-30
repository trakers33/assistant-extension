export class ToggleButton {
    private element: HTMLButtonElement;
    private isTranscriptionVisible: boolean = true;
    private onToggle: (isVisible: boolean) => void;

    constructor(onToggle: (isVisible: boolean) => void) {
        this.onToggle = onToggle;
        this.element = document.createElement('button');
        this.element.textContent = 'Toggle Transcription';
        this.element.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            z-index: 10000;
            display: none;
        `;

        this.element.addEventListener('click', () => {
            this.isTranscriptionVisible = !this.isTranscriptionVisible;
            this.updateButtonText();
            this.onToggle(this.isTranscriptionVisible);
        });
    }

    public mount() {
        document.body.appendChild(this.element);
    }

    public setVisible(isVisible: boolean) {
        this.element.style.display = isVisible ? 'block' : 'none';
    }

    private updateButtonText() {
        this.element.textContent = this.isTranscriptionVisible ? 'Hide Transcription' : 'Show Transcription';
    }

    public isTranscriptionCurrentlyVisible(): boolean {
        return this.isTranscriptionVisible;
    }
}
