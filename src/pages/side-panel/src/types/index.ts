export interface Insight {
    id: number;
    title: string;
    message: string;
    time: string;
}

export enum Tab {
    Transcripts = 'transcripts',
    Participants = 'participants',
    Summary = 'summary',
}

export enum DisplayMode {
    SidePanel = 'side-panel',
    Popup = 'popup',
}

export interface WindowState {
    displayMode: DisplayMode;
    popupWindowId: number | null;
    isExpanded: boolean;
}

export type WindowAction =
    | { type: 'SET_DISPLAY_MODE'; payload: DisplayMode }
    | { type: 'SET_POPUP_WINDOW_ID'; payload: number | null }
    | { type: 'SET_EXPANDED'; payload: boolean };

export interface NavigationTabsProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export interface HeaderProps {
    title: string;
    url: string;
    onMinimize: () => Promise<void>;
    onExpand: () => Promise<void>;
    isExpanded: boolean;
}

export interface FilesSectionProps {
    transcripts: any[];
}

export interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
}

export interface Participant {
    id: string;
    name: string;
    role: string;
    initials: string;
    isExternal: boolean;
}

export interface StorageResult {
    insightsActive?: boolean;
    [key: string]: any;
}
