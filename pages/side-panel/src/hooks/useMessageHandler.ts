import { useState, useEffect, useCallback } from 'react';
import { RuntimeMessage, MessageType, MessageSource, MessageDestination } from '@extension/shared/lib/types/runtime';
import { CaptionData, Participant } from '@extension/shared/lib/types/meeting';

export const useMessageHandler = () => {
    const [captions, setCaptions] = useState<CaptionData[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [title, setTitle] = useState<string>();
    const [url, setUrl] = useState<string>();
    const [meetingId, setMeetingId] = useState<string>();
    const [isMeetingReady, setIsMeetingReady] = useState<boolean>(false);

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

    useEffect(() => {
        const port = chrome.runtime.connect({ name: MessageSource.sidePanel });

        const handleMessage = (message: RuntimeMessage) => {
            const meetingId = message.meetingId || 'default';
            setMeetingId(meetingId);
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
    }, [updateCaptions, updateParticipants]);

    return {
        captions,
        participants,
        title,
        url,
        meetingId,
        setMeetingId,
        updateCaptions,
        isMeetingReady,
        updateParticipants
    };
}; 