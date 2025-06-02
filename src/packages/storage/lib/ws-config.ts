export interface WebSocketConfig {
    endpoint: string;
    enabled: boolean;
}

export const DEFAULT_WS_CONFIG: WebSocketConfig = {
    endpoint: 'ws://157.90.161.156/ws/transcript/',
    enabled: true,
};

export const WS_CONFIG_KEY = 'wsConfig';

export const getWebSocketConfig = async (): Promise<WebSocketConfig> => {
    const result = await chrome.storage.local.get(WS_CONFIG_KEY);
    return result[WS_CONFIG_KEY] || DEFAULT_WS_CONFIG;
};

export const setWebSocketConfig = async (config: WebSocketConfig): Promise<void> => {
    await chrome.storage.local.set({ [WS_CONFIG_KEY]: config });
};
