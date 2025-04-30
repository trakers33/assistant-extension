import { Tab, NavigationTabsProps } from '../types/index';

export const NavigationTabs = ({ isLight, activeTab, onTabChange }: NavigationTabsProps) => {
    return (
        <div className={`border-b ${
            isLight 
                ? 'bg-white border-gray-200' 
                : 'bg-gray-900 border-gray-700'
        }`}>
            <div className="flex">
                <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === Tab.Transcripts
                            ? isLight
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-blue-400 border-b-2 border-blue-400'
                            : isLight
                                ? 'text-gray-500 hover:text-gray-700'
                                : 'text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => onTabChange(Tab.Transcripts)}
                >
                    Transcripts
                </button>
                <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === Tab.Participants
                            ? isLight
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-blue-400 border-b-2 border-blue-400'
                            : isLight
                                ? 'text-gray-500 hover:text-gray-700'
                                : 'text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => onTabChange(Tab.Participants)}
                >
                    Participants
                </button>
                <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === Tab.Files
                            ? isLight
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-blue-400 border-b-2 border-blue-400'
                            : isLight
                                ? 'text-gray-500 hover:text-gray-700'
                                : 'text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => onTabChange(Tab.Files)}
                >
                    Files
                </button>
            </div>
        </div>
    );
};
