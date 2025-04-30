import { HeaderProps } from '../types';
import { useStorage } from '@extension/shared';
import { themeStorage } from '@extension/storage';
import { ControlButtons } from './ControlButtons';
import { DisplayMode } from '@extension/shared/lib/types/side-panel';

export const Header = ({ isLight, title, url, onMinimize, onExpand, isExpanded }: HeaderProps) => {
    const theme = useStorage(themeStorage);

    const handleThemeToggle = () => {
        themeStorage.set(isLight ? 'dark' : 'light');
    };

    return (
        <div 
            className={`meeting-section border-b transition-colors ${
                isLight 
                    ? 'bg-gray-100 border-gray-200 text-gray-900' 
                    : 'bg-gray-800 border-gray-700 text-white'
            }`}
        >
            {/* Toolbar */}
            <div className={`flex items-center justify-end gap-2 px-4 py-2 border-b ${
                isLight 
                    ? 'border-gray-200 bg-gray-50' 
                    : 'border-gray-700 bg-gray-900'
            }`}>
                <button
                    onClick={handleThemeToggle}
                    className={`p-1.5 rounded-md transition-all duration-300 transform hover:scale-110 ${
                        isLight 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title={isLight ? "Switch to dark mode" : "Switch to light mode"}>
                    {isLight ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
                <ControlButtons
                    isLight={isLight}
                    windowState={{ displayMode: DisplayMode.SidePanel, popupWindowId: null, isExpanded }}
                    handleMinimize={onMinimize}
                    handleExpand={onExpand}
                />
            </div>

            {/* Meeting Info */}
            <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="meet-icon p-2 rounded-lg transition-transform hover:scale-105 flex items-center">
                        <img src={chrome.runtime.getURL('side-panel/google_meet_logo.png')} alt="Google Meet" className="h-8" />
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
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                    />
                                </svg>
                                <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-white'}`}>
                                    {url}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
