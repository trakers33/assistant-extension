import { BaseStorage } from '../base/index.js';
import { createStorage } from '../base/base.js';

export interface Transcript {
    meetingId: string;
    title: string;
    url: string;
    captions: Array<{
        timestamp: number;
        text: string;
        speaker?: {
            displayName: string;
        };
    }>;
    createdAt: number;
    summary?: {
        summary: string;
        actionItems: { title: string; description: string }[];
    };
}

const STORAGE_KEY = 'transcripts';

export const transcriptStorage = createStorage<Transcript[]>(STORAGE_KEY, []);

export const addTranscript = async (transcript: Transcript, autoMerge: boolean = false): Promise<void> => {
    const transcripts = await transcriptStorage.get();
    if (autoMerge) {
        const idx = transcripts.findIndex(t => t.meetingId === transcript.meetingId);
        if (idx !== -1) {
            // Merge captions and update createdAt to latest
            const mergedCaptions = [...transcripts[idx].captions, ...transcript.captions].sort(
                (a, b) => a.timestamp - b.timestamp,
            );
            const mergedTranscript = {
                ...transcripts[idx],
                ...transcript, // latest title/url/summary
                captions: mergedCaptions,
                createdAt: Math.max(transcripts[idx].createdAt, transcript.createdAt),
            };
            transcripts[idx] = mergedTranscript;
            await transcriptStorage.set(transcripts);
            return;
        }
    }
    await transcriptStorage.set([...transcripts, transcript]);
};

export const getTranscripts = async (): Promise<Transcript[]> => {
    return await transcriptStorage.get();
};

export const clearTranscripts = async (): Promise<void> => {
    await transcriptStorage.set([]);
};
