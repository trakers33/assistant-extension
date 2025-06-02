interface RecordingStatus {
    isRecording: boolean;
    status: string;
}

interface RecordingMessage {
    type: string;
    data: RecordingStatus;
}

interface TranscriptionMessage {
    type: string;
    data: {
        transcript: string;
        timestamp: string;
    };
}

function mergeBuffers(lhs: Int16Array, rhs: Int16Array): Int16Array {
    const mergedBuffer = new Int16Array(lhs.length + rhs.length);
    mergedBuffer.set(lhs, 0);
    mergedBuffer.set(rhs, lhs.length);
    return mergedBuffer;
}

class AudioCaptureService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private isRecording = false;
    private ws: WebSocket | null = null;
    private streamAudioSource: MediaStreamAudioSourceNode | null = null;
    private stream: MediaStream | null = null;
    private audioChunks: Blob[] = [];
    private controller: ReadableStreamDefaultController | null = null;
    private readonly serverUrl: string;
    private readonly CLOSE_DELAY_MS = 1000; // 1 second delay before closing WebSocket
    private readonly SAMPLE_RATE = 44100;
    private readonly CHANNELS = 1;
    // Pre processing
    private audioWorkletNode: AudioWorkletNode | null = null;
    private audioBufferQueue: Int16Array = new Int16Array(0);
    private onAudioCallback: ((buffer: Uint8Array) => void) | null = null;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    private initializeWebSocket(): void {
        try {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connection established');
            };

            this.ws.onmessage = (event: MessageEvent) => {
                //console.log('WebSocket message received:', event.data);
                try {
                    const transcription = JSON.parse(event.data);
                    this.sendTranscription(transcription);
                } catch (error) {
                    console.error('Error parsing transcription:', error);
                }
            };

            this.ws.onerror = (error: Event) => {
                console.error('WebSocket error:', error);
                this.handleWebSocketError();
            };

            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.handleWebSocketError();
        }
    }

    private handleWebSocketError(): void {
        this.cleanup();
        throw new Error('WebSocket connection failed');
    }

    private closeWebSocket(): void {
        if (this.ws) {
            // Set a small delay before closing to ensure all data is sent
            setTimeout(() => {
                if (this.ws) {
                    this.ws.close();
                    this.ws = null;
                }
            }, this.CLOSE_DELAY_MS);
        }
    }

    private sendRecordingStatus(status: RecordingStatus): void {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0]?.id) {
                const message: RecordingMessage = {
                    type: 'RECORDING_STATUS',
                    data: status,
                };
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }

    private sendTranscription({ transcript, timestamp }: { transcript: string; timestamp: string }): void {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0]?.id) {
                const message: TranscriptionMessage = {
                    type: 'NEW_TRANSCRIPTION',
                    data: {
                        transcript,
                        timestamp,
                    },
                };
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }

    private setupAudioAnalysis(stream: MediaStream): void {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
    }

    private cleanup(): void {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }

        if (this.controller) {
            this.controller.close();
            this.controller = null;
        }

        if (this.stream) {
            this.streamAudioSource?.disconnect();
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.audioBufferQueue = new Int16Array(0);
        this.analyser = null;
        this.isRecording = false;
    }

    async startCapture() {
        try {
            // Initialize WebSocket before starting capture
            this.initializeWebSocket();

            this.onAudioCallback = (audioData: Uint8Array) => {
                //console.log('audioData -> ', audioData.length);
                this.ws?.send(audioData);
            };

            const stream = await new Promise<MediaStream>((resolve, reject) => {
                chrome.tabCapture.capture({ audio: true, video: false }, stream => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (stream) {
                        resolve(stream);
                    } else {
                        reject(new Error('Failed to capture tab audio'));
                    }
                });
            });

            this.audioContext = new AudioContext({
                sampleRate: 16_000,
                latencyHint: 'balanced',
            });
            this.stream = stream;
            this.streamAudioSource = this.audioContext.createMediaStreamSource(stream);
            await this.audioContext.audioWorklet.addModule('audio-processor.js');
            this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

            this.streamAudioSource.connect(this.audioWorkletNode);
            this.audioWorkletNode.connect(this.audioContext.destination);
            this.audioWorkletNode.port.onmessage = event => {
                const currentBuffer = new Int16Array(event.data.audio_data);
                this.audioBufferQueue = mergeBuffers(this.audioBufferQueue, currentBuffer);

                const bufferDuration = this.audioContext
                    ? (this.audioBufferQueue.length / this.audioContext.sampleRate) * 1000
                    : 0;

                // wait until we have 100ms of audio data
                if (bufferDuration >= 100) {
                    const totalSamples = Math.floor(this.audioContext ? this.audioContext.sampleRate * 0.1 : 0);

                    const finalBuffer = new Uint8Array(this.audioBufferQueue.subarray(0, totalSamples).buffer);

                    this.audioBufferQueue = this.audioBufferQueue.subarray(totalSamples);
                    if (this.onAudioCallback) this.onAudioCallback(finalBuffer);
                }
            };
            // Keep streaming audio to the audio context destination (to the user)
            this.streamAudioSource.connect(this.audioContext.destination);

            // Configure MediaRecorder for WAV format
            /* this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000,
            }); */

            this.setupAudioAnalysis(stream);
            this.isRecording = true;

            this.sendRecordingStatus({
                isRecording: true,
                status: 'Recording started',
            });

            /* this.mediaRecorder.ondataavailable = async event => {
                if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
                    //const arrayBuffer = await event.data.arrayBuffer();
                    this.ws.send(event.data);
                }
            };
            this.mediaRecorder.start(500); */
            return true;
        } catch (error) {
            console.error('Error starting audio capture:', error);
            this.cleanup();
            return false;
        }
    }

    stopCapture() {
        if (this.isRecording) {
            this.cleanup();
            this.sendRecordingStatus({
                isRecording: false,
                status: 'Recording stopped',
            });
            this.closeWebSocket();
        }
    }

    handleStreamCancelled() {
        if (this.isRecording) {
            this.cleanup();
            this.sendRecordingStatus({
                isRecording: false,
                status: 'Stream cancelled',
            });
            this.closeWebSocket();
        }
    }

    getAudioLevel(): number {
        if (!this.analyser) return 0;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) of the frequency data
        const sum = dataArray.reduce((a, b) => a + b * b, 0);
        const rms = Math.sqrt(sum / dataArray.length);

        // Convert to a 0-100 scale
        const level = Math.min(100, (rms / 128) * 100);
        return Math.round(level);
    }

    isRecordingActive(): boolean {
        return this.isRecording;
    }
}

export default AudioCaptureService;
