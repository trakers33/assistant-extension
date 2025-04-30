import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

export type Theme = 'light' | 'dark';

export interface Options {
    autoCaptions: boolean;
    theme: Theme;
}

const defaultOptions: Options = {
    autoCaptions: true,
    theme: 'light'
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
        autoCaptions: value
    }));
};

export const getTheme = async (): Promise<Theme> => {
    const options = await optionsStorage.get();
    return options.theme;
};

export const setTheme = async (theme: Theme): Promise<void> => {
    await optionsStorage.set(current => ({
        ...current,
        theme
    }));
};

export const toggleTheme = async (): Promise<void> => {
    await optionsStorage.set(current => ({
        ...current,
        theme: current.theme === 'light' ? 'dark' : 'light'
    }));
}; 