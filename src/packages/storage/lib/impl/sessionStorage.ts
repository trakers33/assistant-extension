import { createStorage, StorageEnum } from '../base/index.js';

export interface SupabaseSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
    user: any;
}

const defaultSession: SupabaseSession | null = null;

export const supabaseSessionStorage = createStorage<SupabaseSession | null>('supabaseSession', defaultSession, {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
});

export const getSupabaseSession = async (): Promise<SupabaseSession | null> => {
    return await supabaseSessionStorage.get();
};

export const setSupabaseSession = async (session: SupabaseSession | null): Promise<void> => {
    await supabaseSessionStorage.set(session);
};
