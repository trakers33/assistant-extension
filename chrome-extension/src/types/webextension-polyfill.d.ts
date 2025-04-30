declare module 'webextension-polyfill' {
    export interface Tab {
        id?: number;
        url?: string;
        title?: string;
        favIconUrl?: string;
    }

    export interface Tabs {
        Tab: Tab;
    }

    export interface Port {
        name: string;
        postMessage: (message: any) => void;
        onMessage: {
            addListener: (callback: (message: any) => void) => void;
        };
        onDisconnect: {
            addListener: (callback: () => void) => void;
        };
    }

    export interface Runtime {
        onStartup: {
            addListener: (callback: () => void) => void;
        };
        onInstalled: {
            addListener: (callback: () => void) => void;
        };
        onConnect: {
            addListener: (callback: (port: Port) => void) => void;
        };
        onMessage: {
            addListener: (callback: (message: any) => void) => void;
        };
        onActionClicked: {
            addListener: (callback: (tab: Tab) => void) => void;
        };
        getPlatformInfo: () => Promise<any>;
        getURL: (path: string) => string;
        connect: (options: { name: string }) => Port;
    }

    export interface Storage {
        local: {
            clear: () => Promise<void>;
        };
    }

    export const runtime: Runtime;
    export const storage: Storage;
    export const tabs: Tabs;
}
