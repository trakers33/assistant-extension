import { DisplayMode, ControlButtonsProps, WindowState } from '@extension/shared/lib/types/side-panel';
import { MessageType, MessageDestination } from '@extension/shared/lib/types/runtime';

export const ControlButtons = ({ isLight, windowState, handleMinimize, handleExpand }: ControlButtonsProps) => {
    return (
        <div className="flex gap-2">
            {windowState.displayMode === DisplayMode.SidePanel && (
                <>
                    <button
                        onClick={handleExpand}
                        disabled={!!windowState.popupWindowId}
                        className={`p-2 rounded-md transition-all duration-300 transform hover:scale-110 ${
                            isLight
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-300 disabled:text-gray-500'
                                : 'bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-400'
                        }`}
                        title={windowState.isExpanded ? 'Minimize window' : 'Expand window'}>
                        {windowState.isExpanded ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </button>
                </>
            )}
            {/* {windowState.displayMode === DisplayMode.Popup && (
                <button
                    onClick={handleMinimize}
                    className={`p-2 rounded-md transition-all duration-300 transform hover:scale-110 ${
                        isLight 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                    title="Minimize to side panel">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                </button>
            )} */}
        </div>
    );
};
