import React, { useState } from 'react';
import { MeetingProfile } from '@extension/storage/lib/impl/optionsStorage';
import ReactMarkdown from 'react-markdown';
import 'github-markdown-css';
import { useTheme } from '@extension/ui/lib/components/ThemeProvider';

interface SummarySectionProps {
    profiles: MeetingProfile[];
    onGenerateSummary: (profile: MeetingProfile, instructions: string) => void;
    generatedSummary: string;
    actionItems: { title: string; description: string }[];
    isGenerating: boolean;
    error: string | null;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
    profiles,
    onGenerateSummary,
    generatedSummary,
    actionItems,
    isGenerating,
    error,
}) => {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id || '');
    const [instructions, setInstructions] = useState('');
    const [summaryTab, setSummaryTab] = useState<'config' | 'preview'>('config');
    const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

    return (
        <div
            className={`summary-section px-4 py-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}
            role="tabpanel"
            id="summary-panel">
            {/* Inner Tabs */}
            <div className="flex mb-6 border-b">
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${summaryTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'}`}
                    onClick={() => setSummaryTab('config')}>
                    Configuration
                </button>
                <button
                    className={`ml-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${summaryTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'}`}
                    onClick={() => setSummaryTab('preview')}>
                    Preview
                </button>
            </div>
            {/* Tab Content */}
            {summaryTab === 'config' && (
                <>
                    <div className="mb-6 flex flex-row gap-6 flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-[200px] md:basis-1/2 md:max-w-[50%]">
                            <label
                                className={`block text-sm font-medium mb-1 text-left ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                                Profile
                            </label>
                            <select
                                value={selectedProfileId}
                                onChange={e => setSelectedProfileId(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none ${isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-800 border-gray-600 text-gray-100'}`}>
                                {profiles.map(profile => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px] md:basis-1/2 md:max-w-[50%]">
                            <label
                                className={`block text-sm font-medium mb-1 text-left ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                                Instructions
                            </label>
                            <textarea
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                                placeholder="Add custom instructions..."
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none resize-y min-h-[40px] ${isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-800 border-gray-600 text-gray-100'}`}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => onGenerateSummary(selectedProfile, instructions)}
                        className={`w-full ${generatedSummary ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 mb-4 font-semibold transition`}
                        disabled={isGenerating}>
                        {isGenerating
                            ? generatedSummary
                                ? 'Regenerating...'
                                : 'Generating...'
                            : generatedSummary
                              ? 'Regenerate Summary'
                              : 'Generate Summary'}
                    </button>
                    {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                </>
            )}
            {summaryTab === 'preview' && (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <label className={`block text-sm font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                            Generated Summary
                        </label>
                    </div>
                    <div
                        className={`min-h-[80px] p-3 rounded border ${isLight ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-gray-800 border-gray-700 text-gray-100'} mb-4 flex`}>
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-8 w-full">
                                <div className="mb-3">
                                    <svg
                                        className="animate-spin h-10 w-10 text-blue-500"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                </div>
                                <span className="text-blue-600 text-base font-medium mb-4">
                                    Hang tight! Your summary is being generated. This may take a few moments depending
                                    on the meeting length.
                                </span>
                            </div>
                        ) : error ? (
                            <div className="text-red-600 text-sm w-full flex items-center justify-center">{error}</div>
                        ) : generatedSummary ? (
                            <div className="markdown-body text-left overflow-y-auto w-full">
                                <ReactMarkdown>{generatedSummary}</ReactMarkdown>
                            </div>
                        ) : (
                            <span className="text-gray-400">No summary generated yet.</span>
                        )}
                    </div>
                    {/* Action Items below summary */}
                    <div className="mt-6">
                        <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                            Action Items
                        </h3>
                        {actionItems && actionItems.length > 0 ? (
                            <div className="flex flex-col gap-2 w-full">
                                {actionItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="w-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/40 rounded-lg p-3 shadow-sm flex flex-row items-start gap-3 transition hover:shadow-md">
                                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-800 mt-1">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 text-blue-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-blue-900 dark:text-blue-100 text-base mb-1">
                                                {item.title}
                                            </div>
                                            <div className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-line">
                                                {item.description}
                                            </div>
                                        </div>
                                        <button
                                            className="ml-2 px-3 py-1 rounded bg-blue-400 text-white font-semibold text-xs shadow disabled:opacity-60 disabled:cursor-not-allowed self-center"
                                            disabled>
                                            Done
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 dark:text-gray-400">No action items generated yet.</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
