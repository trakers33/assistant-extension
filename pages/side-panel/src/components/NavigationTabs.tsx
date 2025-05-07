import { Tab, NavigationTabsProps } from '../types/index';

export const NavigationTabs = ({ activeTab, onTabChange }: NavigationTabsProps) => {
    return (
        <div className={`border-b bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700`}>
            <div className="flex">
                <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === Tab.Transcripts
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    onClick={() => onTabChange(Tab.Transcripts)}>
                    Transcripts
                </button>
                <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === Tab.Participants
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    onClick={() => onTabChange(Tab.Participants)}>
                    Participants
                </button>
                <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${
                        activeTab === Tab.Summary
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    onClick={() => onTabChange(Tab.Summary)}>
                    Summary
                </button>
            </div>
        </div>
    );
};
