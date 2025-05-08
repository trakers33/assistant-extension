import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

export type Theme = 'light' | 'dark';

export interface MeetingProfile {
    id: string;
    name: string;
    userName: string;
    objective: string;
    structure: string;
    tone?: string;
    language?: string;
    audience?: string;
}

export interface Options {
    autoCaptions: boolean;
    theme: Theme;
    profiles?: MeetingProfile[];
    openAIApiKey?: string;
    autoMerge?: boolean;
}

const defaultProfiles: MeetingProfile[] = [
    {
        id: 'default',
        name: 'Default',
        userName: 'User',
        objective: 'Provide a general summary of the call.',
        structure: 'Introduction, Main Points, Conclusion',
        tone: 'neutral',
        language: 'English',
        audience: 'General',
    },
    {
        id: 'sales',
        name: 'Summary - Sales Oriented',
        userName: 'Sales Rep',
        objective: 'Summarize the call with a focus on sales opportunities and client needs.',
        structure: 'Client Needs, Product Fit, Next Steps',
        tone: 'persuasive',
        language: 'English',
        audience: 'Sales Team',
    },
    {
        id: 'engineer',
        name: 'Summary - Software Engineer Oriented',
        userName: 'Engineer',
        objective: 'Summarize the call with a focus on technical details and action items.',
        structure: 'Technical Discussion, Issues, Action Items',
        tone: 'concise',
        language: 'English',
        audience: 'Engineering Team',
    },
];

const defaultOptions: Options = {
    autoCaptions: true,
    theme: 'light',
    profiles: defaultProfiles,
    openAIApiKey: '',
    autoMerge: true,
};

export const optionsStorage = createStorage<Options>('options', defaultOptions, {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
});

// Helper functions for individual options
export const getAutoCaptions = async (): Promise<boolean> => {
    const options = await optionsStorage.get();
    return options.autoCaptions;
};

export const setAutoCaptions = async (value: boolean): Promise<void> => {
    await optionsStorage.set(current => ({
        ...current,
        autoCaptions: value,
    }));
};

export const getProfiles = async (): Promise<MeetingProfile[]> => {
    const options = await optionsStorage.get();
    return options.profiles || defaultProfiles;
};

export const setProfiles = async (profiles: MeetingProfile[]): Promise<void> => {
    await optionsStorage.set(current => ({
        ...current,
        profiles,
    }));
};

export const getAutoMerge = async (): Promise<boolean> => {
    const options = await optionsStorage.get();
    return options.autoMerge ?? true;
};

export const setAutoMerge = async (value: boolean): Promise<void> => {
    await optionsStorage.set(current => ({
        ...current,
        autoMerge: value,
    }));
};
