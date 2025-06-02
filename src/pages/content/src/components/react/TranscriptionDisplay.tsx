import React from 'react';

interface TranscriptionDisplayProps {
    isVisible: boolean;
    transcript: string;
    timestamp: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ isVisible, transcript, timestamp }) => {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                maxWidth: '300px',
                zIndex: 10000,
                animation: 'fadeIn 0.5s ease-in-out',
                display: isVisible ? 'block' : 'none',
            }}>
            <div style={{ marginBottom: '8px' }}>{transcript}</div>
            <div
                style={{
                    fontSize: '0.8em',
                    opacity: 0.7,
                    float: 'right',
                }}>
                {new Date(timestamp).toLocaleTimeString()}
            </div>
        </div>
    );
};
