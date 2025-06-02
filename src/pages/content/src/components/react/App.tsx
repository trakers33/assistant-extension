import React, { useState, useEffect } from 'react';
import { TranscriptionDisplay } from './TranscriptionDisplay';

interface Transcription {
    transcript: string;
    timestamp: string;
}

export const App: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscriptionVisible, setIsTranscriptionVisible] = useState(true);
    const [transcription, setTranscription] = useState<Transcription>({
        transcript: '',
        timestamp: new Date().toISOString(),
    });

    useEffect(() => {
        const handleMessage = (message: any) => {
            if (message.type === 'RECORDING_STATUS') {
                setIsRecording(message.data.isRecording);
            } else if (message.type === 'NEW_TRANSCRIPTION') {
                setTranscription({
                    transcript: message.data.transcript,
                    timestamp: message.data.timestamp,
                });
            } else if (message.type === 'TOGGLE_TRANSCRIPTION') {
                setIsTranscriptionVisible(message.data.isVisible);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => {
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    return (
        <TranscriptionDisplay
            isVisible={isRecording && isTranscriptionVisible}
            transcript={transcription.transcript}
            timestamp={transcription.timestamp}
        />
    );
};
