import { DisplayMode } from '@extension/shared/lib/types/side-panel';

export interface HeaderProps {
    isLight: boolean;
    title?: string;
    url?: string;
    onMinimize: () => Promise<void>;
    onExpand: () => Promise<void>;
    isExpanded: boolean;
} 