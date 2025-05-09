import React from 'react';

export interface NotInMeetingPageProps {
    isLight: boolean;
    setTheme: (theme: 'light' | 'dark') => void;
}

export const NotInMeetingPage: React.FC<NotInMeetingPageProps> = ({ isLight, setTheme }) => (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-gray-600 dark:text-gray-400">
        <div className="text-center">
            <svg
                className="w-16 h-16 mx-auto mb-6 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Not in a Google Meet</h2>
            <p className="text-base text-gray-600 dark:text-gray-400">
                Please join a Google Meet call to use the assistant features.
            </p>
        </div>
    </div>
);
