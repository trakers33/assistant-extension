import React from 'react';

export interface AudioMeterProps {
    audioLevel: number;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({ audioLevel }) => {
    return (
        <div className="w-full h-4 bg-gray-200 rounded overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
            />
        </div>
    );
};
