import { useState, useEffect, useCallback } from 'react';
import { RuntimeMessage, MessageType, MessageSource, MessageDestination } from '@extension/shared/lib/types/runtime';
import { CaptionData, Participant } from '@extension/shared/lib/types/meeting';
import { Insight } from '@extension/shared/lib/types';
import moment from 'moment';

export const useMessageHandler = () => {
    const [captions, setCaptions] = useState<CaptionData[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [title, setTitle] = useState<string>();
    const [url, setUrl] = useState<string>();
    const [meetingId, setMeetingId] = useState<string>();
    const [isMeetingReady, setIsMeetingReady] = useState<boolean>(false);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [currentInsight, setCurrentInsight] = useState(0);
    const [isInsightsActive, setIsInsightsActive] = useState(true);

    const updateCaptions = useCallback((newCaptions: CaptionData[]) => {
        setCaptions(prevCaptions => {
            const captionMap = new Map<number, CaptionData>();

            prevCaptions.forEach(caption => {
                captionMap.set(caption.captionId, caption);
            });

            newCaptions.forEach((newCaption: CaptionData) => {
                const existingCaption = captionMap.get(newCaption.captionId);
                if (!existingCaption || newCaption.version > existingCaption.version) {
                    captionMap.set(newCaption.captionId, newCaption);
                }
            });

            return Array.from(captionMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        });
    }, []);

    const updateParticipants = useCallback((data: Participant[]) => {
        setParticipants(data);
    }, []);

    function formatRelativeTime(timestamp: string) {
        return moment.utc(timestamp).local().fromNow();
    }

    // Accept a single insight object, append to list, update currentInsight, and set active
    const updateInsights = useCallback((data: any) => {
        // Map incoming data to Insight type
        const newInsight = {
            id: data.id,
            title: data.title,
            message: data.body,
            time: formatRelativeTime(data.timestamp),
            timestamp: data.timestamp,
        };
        setInsights(prev => {
            const updated = [...prev, newInsight];
            setCurrentInsight(updated.length - 1);
            setIsInsightsActive(true);
            return updated;
        });
        console.log('updateInsights', data);
    }, []);

    // Remove an insight by id
    const removeInsight = useCallback((id: number) => {
        setInsights(prev => {
            const filtered = prev.filter(insight => insight.id !== id);
            // Adjust currentInsight if needed
            setCurrentInsight(ci => Math.max(0, Math.min(ci, filtered.length - 1)));
            return filtered;
        });
    }, []);

    // Navigate insights
    const navigateInsight = useCallback(
        (direction: 'prev' | 'next') => {
            setCurrentInsight(ci => {
                if (direction === 'prev') return Math.max(0, ci - 1);
                return Math.min(insights.length - 1, ci + 1);
            });
        },
        [insights.length],
    );

    useEffect(() => {
        const port = chrome.runtime.connect({ name: MessageSource.sidePanel });

        const handleMessage = (message: RuntimeMessage) => {
            const meetingId = message.meetingId || 'default';
            setMeetingId(meetingId);
            console.log('message', message);
            switch (message.type) {
                case MessageType.CAPTIONS_UPDATE:
                    updateCaptions(message.data);
                    break;
                case MessageType.USERS_UPDATE:
                    updateParticipants(message.data.participants);
                    break;
                case MessageType.MEETING_INFO:
                    const { title, url } = message.data;
                    setTitle(title);
                    setUrl(url);
                    break;
                case MessageType.MEETING_READY:
                    setIsMeetingReady(message.data.isReady);
                    break;
                case MessageType.INSIGHTS_UPDATE:
                    updateInsights(message.data);
                    break;
                default:
                    console.warn('Side panel received message that is not handled', message);
                    break;
            }
        };

        port.onMessage.addListener(handleMessage);

        return () => {
            console.log('disconnecting port');
            port.disconnect();
        };
    }, [updateCaptions, updateParticipants, updateInsights]);

    return {
        captions,
        participants,
        title,
        url,
        meetingId,
        setMeetingId,
        updateCaptions,
        isMeetingReady,
        updateParticipants,
        insights,
        currentInsight,
        isInsightsActive,
        updateInsights,
        removeInsight,
        navigateInsight,
    };
};
