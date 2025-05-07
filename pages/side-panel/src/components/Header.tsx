import { HeaderProps } from '../types';
import { useTheme } from '@extension/ui/lib/components/ThemeProvider';
import { ControlButtons } from './ControlButtons';
import { DisplayMode } from '@extension/shared/lib/types/side-panel';
import { FiSun, FiMoon, FiSettings } from 'react-icons/fi';

export const Header = ({ title, url, onMinimize, onExpand, isExpanded }: HeaderProps) => {
    const { theme, setTheme } = useTheme();
    const isLight = theme === 'light';
    const handleThemeToggle = () => {
        setTheme(isLight ? 'dark' : 'light');
    };

    return (
        <div
            className={`meeting-section border-b transition-colors ${
                isLight ? 'bg-gray-100 border-gray-200 text-gray-900' : 'bg-gray-800 border-gray-700 text-white'
            }`}>
            {/* Toolbar */}
            <div
                className={`flex items-center justify-end gap-2 px-4 py-2 border-b ${
                    isLight ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900'
                }`}>
                <button
                    onClick={handleThemeToggle}
                    className={`p-1.5 rounded-md transition-all duration-300 transform hover:scale-110 ${
                        isLight
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                    aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}>
                    {isLight ? <FiMoon className="h-4 w-4" /> : <FiSun className="h-4 w-4" />}
                </button>
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className={`p-1.5 rounded-md transition-all duration-300 transform hover:scale-110 ${
                        isLight
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title="Open settings"
                    aria-label="Open settings">
                    <FiSettings className="h-4 w-4" />
                </button>
                {/* <ControlButtons
                    isLight={isLight}
                    windowState={{ displayMode: DisplayMode.SidePanel, popupWindowId: null, isExpanded }}
                    handleMinimize={onMinimize}
                    handleExpand={onExpand}
                /> */}
            </div>

            {/* Meeting Info */}
            <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="meet-icon p-2 rounded-lg transition-transform hover:scale-105 flex items-center">
                        <img
                            src={chrome.runtime.getURL('side-panel/google_meet_logo.png')}
                            alt="Google Meet"
                            className="h-8"
                        />
                    </div>
                    <div className="flex-1">
                        <h2 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {title || 'Untitled Meeting'}
                        </h2>
                        {url && (
                            <div className="flex items-center gap-2 mt-1">
                                <svg
                                    className={`w-4 h-4 ${isLight ? 'text-gray-500' : 'text-white'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                    />
                                </svg>
                                <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-white'}`}>{url}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
