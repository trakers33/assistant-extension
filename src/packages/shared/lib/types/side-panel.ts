import { CaptionData, Participant } from './meeting.js';
import { MessageSource } from './runtime.js';

export interface Insight {
    id: number;
    title: string;
    message: string;
    time: string;
}

export type TabType = 'participants' | 'notes' | 'transcripts';

export interface StorageResult {
    insightsActive?: boolean;
    [key: string]: any;
}

export interface FileMetadata {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
    status: 'uploading' | 'completed' | 'error';
    progress?: number;
}

export interface RecordingStatus {
    isRecording: boolean;
    status: string;
}

export interface RecordingMessage {
    type: string;
    data: RecordingStatus;
}

export interface TranscriptionMessage {
    type: string;
    data: {
        transcript: string;
        timestamp: string;
    };
}

export interface GroupedCaption {
    speaker: Participant | null;
    messages: {
        text: string;
        timestamp: number;
    }[];
    firstTimestamp: number;
    lastTimestamp: number;
}

export enum Tab {
    Participants = 'participants',
    Files = 'files',
    Transcripts = 'transcripts',
}

export enum DisplayMode {
    SidePanel = 'sidePanel',
    Popup = 'popup',
}

// Window State Types
export interface WindowState {
    displayMode: DisplayMode;
    popupWindowId: number | null;
    isExpanded: boolean;
}

export type WindowAction =
    | { type: 'SET_DISPLAY_MODE'; payload: DisplayMode }
    | { type: 'SET_POPUP_WINDOW_ID'; payload: number | null }
    | { type: 'SET_EXPANDED'; payload: boolean };

export interface InsightsToggleProps {
    isActive: boolean;
    onToggle: () => void;
}

export interface ParticipantsSectionProps {
    participants: Participant[];
    isLight: boolean;
}

export interface InsightCardProps {
    insight: Insight;
    onRemove: (id: number) => void;
    totalInsights: number;
    currentIndex: number;
    onNavigate: (direction: 'prev' | 'next') => void;
}

export interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
}

export interface TranscriptsSectionProps {
    captions: CaptionData[];
    isLight?: boolean;
}

export interface AudioControlsProps {
    isRecording: boolean;
    audioLevel: number;
    onStartRecording: () => void;
    onStopRecording: () => void;
}

export interface HeaderProps {
    isLight: boolean;
    title: string;
    url: string;
    showToast: boolean;
    setShowToast: (show: boolean) => void;
}

export interface NavigationTabsProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isLight: boolean;
}

export interface ControlButtonsProps {
    isLight: boolean;
    windowState: WindowState;
    handleMinimize: () => Promise<void>;
    handleExpand: () => Promise<void>;
}
