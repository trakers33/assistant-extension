import React, { useMemo, useRef, useEffect, useState } from 'react';
import { CaptionData } from '@extension/shared/lib/types/meeting';
import { GroupedCaption, TranscriptsSectionProps } from '@extension/shared/lib/types/side-panel';
import { Switch } from '@headlessui/react';
import { useStorage } from '@extension/shared';
import { optionsStorage, setAutoCaptions, setAutoMerge } from '@extension/storage';
import moment from 'moment';
import { useTheme } from '@extension/ui/lib/components/ThemeProvider';
import { InsightsToggle } from '@extension/ui/lib/components/InsightsToggle';

export const TranscriptsSection = ({
    captions,
    onDownload,
    insightsEnabled = false,
    onToggleInsights = () => {},
}: TranscriptsSectionProps & { onDownload: () => void; insightsEnabled?: boolean; onToggleInsights?: () => void }) => {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const options = useStorage(optionsStorage);

    useEffect(() => {
        if (containerRef.current && shouldAutoScroll) {
            const container = containerRef.current;
            container.scrollTop = 0;
        }
    }, [captions, shouldAutoScroll]);

    const handleScroll = () => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const isAtTop = container.scrollTop < 50;
        setShouldAutoScroll(isAtTop);
    };

    const formatTime = (timestamp: number) => {
        return moment(timestamp * 1000).format('HH:mm:ss');
    };

    const formatTimeRange = (start: number, end: number) => {
        return `${formatTime(start)}${start !== end ? ` - ${formatTime(end)}` : ''}`;
    };

    const groupedCaptions = useMemo(() => {
        const grouped: GroupedCaption[] = [];
        let currentGroup: GroupedCaption | null = null;

        captions
            .sort((a, b) => a.captionHeader.timestamp - b.captionHeader.timestamp)
            .forEach((caption: CaptionData) => {
                if (
                    currentGroup &&
                    currentGroup.speaker?.deviceId === caption.speaker?.deviceId &&
                    caption.captionHeader.timestamp - currentGroup.lastTimestamp < 30000
                ) {
                    currentGroup.messages.push({
                        text: caption.text,
                        timestamp: caption.captionHeader.timestamp,
                    });
                    currentGroup.lastTimestamp = caption.captionHeader.timestamp;
                } else {
                    if (currentGroup) {
                        grouped.push(currentGroup);
                    }
                    currentGroup = {
                        speaker: caption.speaker || null,
                        messages: [
                            {
                                text: caption.text,
                                timestamp: caption.captionHeader.timestamp,
                            },
                        ],
                        firstTimestamp: caption.captionHeader.timestamp,
                        lastTimestamp: caption.captionHeader.timestamp,
                    };
                }
            });

        if (currentGroup) {
            grouped.push(currentGroup);
        }

        // Return groups in reverse chronological order (newest first)
        return grouped.reverse();
    }, [captions]);

    return (
        <div
            className={`transcripts px-4 py-4 overflow-y-auto ${isLight ? 'bg-gray-50' : 'bg-gray-900'}`}
            role="tabpanel"
            id="transcripts-panel"
            ref={containerRef}
            onScroll={handleScroll}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <InsightsToggle isActive={insightsEnabled} onToggle={onToggleInsights} />
                </div>
                {captions.length > 0 && (
                    <button
                        onClick={onDownload}
                        title="Download Transcript"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors duration-200 ${
                            isLight ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-gray-700 text-gray-300'
                        }`}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="text-sm font-medium">Download</span>
                    </button>
                )}
            </div>

            {captions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48">
                    <p className={`mt-2 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        No captions available yet
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {groupedCaptions.map((group, index) => (
                    <div
                        key={index}
                        className={`p-3 rounded-lg shadow-sm border ${
                            isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
                        }`}>
                        <div className="flex items-start gap-2">
                            <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                                    isLight ? 'bg-blue-100' : 'bg-blue-900'
                                }`}>
                                {group.speaker?.profilePicture ? (
                                    <img
                                        src={group.speaker.profilePicture}
                                        alt={group.speaker.displayName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span
                                        className={`text-sm font-medium ${
                                            isLight ? 'text-blue-600' : 'text-blue-300'
                                        }`}>
                                        {group.speaker?.displayName?.[0] || '?'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                        {group.speaker?.displayName || 'Unknown Speaker'}
                                    </span>
                                    <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {formatTimeRange(group.firstTimestamp, group.lastTimestamp)}
                                    </span>
                                </div>
                                <div className={`space-y-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                    <p>
                                        {group.messages.map((message, msgIndex) => (
                                            <span key={msgIndex}>
                                                {msgIndex > 0 ? ' ' : ''}
                                                {message.text}
                                            </span>
                                        ))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
