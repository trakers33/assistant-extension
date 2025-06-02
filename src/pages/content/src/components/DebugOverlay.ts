export class DebugOverlay {
    private element: HTMLDivElement;
    private audioMeter: HTMLDivElement;
    private audioLevel: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'debug-overlay';
        this.element.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            width: 200px;
            height: 100px;
            display: none;
        `;

        this.audioMeter = document.createElement('div');
        this.audioMeter.style.cssText = `
            width: 100%;
            height: 20px;
            background: rgba(255, 255, 255, 0.1);
            margin-top: 5px;
            border-radius: 3px;
            overflow: hidden;
        `;

        this.audioLevel = document.createElement('div');
        this.audioLevel.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(to right, #4CAF50, #FFC107);
            transition: width 0.1s ease-out;
        `;

        this.audioMeter.appendChild(this.audioLevel);
        this.element.appendChild(this.audioMeter);
    }

    public mount() {
        document.body.appendChild(this.element);
    }

    public updateStatus(isRecording: boolean, status: string) {
        const statusText = isRecording ? 'ON' : 'OFF';
        const color = isRecording ? '#4CAF50' : '#FF5252';

        this.element.innerHTML = `
            <div>Recording: <span style="color: ${color}">${statusText}</span></div>
            <div>Status: ${status || 'Not initialized'}</div>
        `;
        this.element.appendChild(this.audioMeter);
    }

    public setVisible(isVisible: boolean) {
        this.element.style.display = isVisible ? 'block' : 'none';
    }

    public updateAudioLevel(level: number) {
        this.audioLevel.style.width = `${level}%`;
    }
}
