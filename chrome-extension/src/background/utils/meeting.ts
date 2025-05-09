import type { Participant, CaptionData } from '@extension/shared/lib/types/meeting';
import { sendWebSocketMessageForMeeting } from './websocket';

// State
export const participantsMap = new Map<string, Participant[]>();
export const captionsMap = new Map<string, CaptionData[]>();
export const meetingInfoMap = new Map<string, { title: string; url: string }>();
export const insightsMap = new Map<string, { insights: any[]; currentInsight: number; isInsightsActive: boolean }>();

// Participants
export function getParticipants(meetingId: string): Participant[] {
    return participantsMap.get(meetingId) || [];
}
export function setParticipants(meetingId: string, participants: Participant[]) {
    participantsMap.set(meetingId, participants);
}

// Captions
export function getCaptions(meetingId: string): CaptionData[] {
    return captionsMap.get(meetingId) || [];
}
export function setCaptions(meetingId: string, captions: CaptionData[]) {
    captionsMap.set(meetingId, captions);
}
export function addCaption(meetingId: string, caption: CaptionData) {
    const captions = captionsMap.get(meetingId) || [];
    captions.push(caption);
    captionsMap.set(meetingId, captions);
}

// Meeting Info
export function getMeetingInfo(meetingId: string) {
    return meetingInfoMap.get(meetingId);
}
export function setMeetingInfo(meetingId: string, info: { title: string; url: string }) {
    meetingInfoMap.set(meetingId, info);
}

// Insights
export function getInsights(meetingId: string) {
    return insightsMap.get(meetingId);
}
export function setInsights(
    meetingId: string,
    insights: { insights: any[]; currentInsight: number; isInsightsActive: boolean },
) {
    insightsMap.set(meetingId, insights);
}

// Reset meeting state
export function resetMeeting(meetingId: string) {
    participantsMap.set(meetingId, []);
    captionsMap.set(meetingId, []);
    meetingInfoMap.set(meetingId, { title: '', url: '' });
    insightsMap.set(meetingId, { insights: [], currentInsight: 0, isInsightsActive: false });
}

// Remove all state for a meeting
export function clearMeeting(meetingId: string) {
    participantsMap.delete(meetingId);
    captionsMap.delete(meetingId);
    meetingInfoMap.delete(meetingId);
    insightsMap.delete(meetingId);
}

/**
 * Handle a CAPTIONS_UPDATE message: deduplicate, version, stream, and update state.
 */
export function handleCaptionsUpdate(meetingId: string, newCaptions: CaptionData[]) {
    const currentCaptions = getCaptions(meetingId) || [];
    const captionMap = new Map<number, CaptionData>();

    // Add all existing captions to the map
    currentCaptions.forEach(caption => {
        captionMap.set(caption.captionId, caption);
    });

    // Update with new captions, keeping only the latest version
    newCaptions.forEach((newCaption: CaptionData) => {
        const existingCaption = captionMap.get(newCaption.captionId);
        if (!existingCaption || newCaption.version > existingCaption.version) {
            captionMap.set(newCaption.captionId, newCaption);
            // Stream new/updated captions to WebSocket
            sendWebSocketMessageForMeeting(meetingId, 'user_id', newCaption);
        }
    });

    // Convert back to array and sort by timestamp
    const updatedCaptions = Array.from(captionMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    setCaptions(meetingId, updatedCaptions);
}
