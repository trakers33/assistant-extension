import { BaseStorage } from '../base/index.js';
import { createStorage } from '../base/base.js';

export interface Transcript {
    meetingId: string;
    title: string;
    url: string;
    captions: Array<{
        timestamp: number;
        text: string;
        speaker?: string;
    }>;
    createdAt: number;
}

const STORAGE_KEY = 'transcripts';

export const transcriptStorage = createStorage<Transcript[]>(STORAGE_KEY, []);

export const addTranscript = async (transcript: Transcript): Promise<void> => {
    const transcripts = await transcriptStorage.get();
    await transcriptStorage.set([...transcripts, transcript]);
};

export const getTranscripts = async (): Promise<Transcript[]> => {
    return await transcriptStorage.get();
};

export const clearTranscripts = async (): Promise<void> => {
    await transcriptStorage.set([]);
}; 