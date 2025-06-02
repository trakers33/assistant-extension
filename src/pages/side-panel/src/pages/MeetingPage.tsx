import React from 'react';
import { HeaderActions, HeaderTitle } from '../components/Header';
import { NavigationTabs } from '../components/NavigationTabs';
import { InsightCard } from '@extension/ui';
import { TranscriptsSection } from '../components/TranscriptsSection';
import { ParticipantsSection } from '../components/ParticipantsSection';
import { SummarySection } from '../components/SummarySection';
import { Tab } from '../types/index';

export interface MeetingPageProps {
    isLight: boolean;
    setTheme: (theme: 'light' | 'dark') => void;
    title?: string;
    url?: string;
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isInsightsActive: boolean;
    insights: any[];
    currentInsight: number;
    removeInsight: (id: number) => void;
    navigateInsight: (direction: 'prev' | 'next') => void;
    captions: any[];
    handleDownloadTranscript: () => void;
    participants: any[];
    profiles: any[];
    handleGenerateSummary: (...args: any[]) => void;
    summaryResult: { summary: string; actionItems: any[] };
    isGenerating: boolean;
    summaryError: string | null;
}

export const MeetingPage: React.FC<MeetingPageProps> = ({
    isLight,
    setTheme,
    title,
    url,
    activeTab,
    setActiveTab,
    isInsightsActive,
    insights,
    currentInsight,
    removeInsight,
    navigateInsight,
    captions,
    handleDownloadTranscript,
    participants,
    profiles,
    handleGenerateSummary,
    summaryResult,
    isGenerating,
    summaryError,
}) => (
    <>
        <HeaderActions isLight={isLight} handleThemeToggle={() => setTheme(isLight ? 'dark' : 'light')} />
        <HeaderTitle title={title} url={url} isLight={isLight} />
        <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto">
            {activeTab === Tab.Transcripts && (
                <>
                    {isInsightsActive && insights.length > 0 && (
                        <div className="p-4">
                            <InsightCard
                                insight={insights[currentInsight]}
                                onRemove={removeInsight}
                                totalInsights={insights.length}
                                currentIndex={currentInsight}
                                onNavigate={navigateInsight}
                            />
                        </div>
                    )}
                    <TranscriptsSection captions={captions} onDownload={handleDownloadTranscript} />
                </>
            )}
            {activeTab === Tab.Participants && <ParticipantsSection participants={participants} isLight={isLight} />}
            {activeTab === Tab.Summary && profiles.length > 0 && (
                <div className="pt-2">
                    <SummarySection
                        profiles={profiles}
                        onGenerateSummary={handleGenerateSummary}
                        generatedSummary={summaryResult.summary}
                        actionItems={summaryResult.actionItems}
                        isGenerating={isGenerating}
                        error={summaryError}
                    />
                </div>
            )}
        </div>
    </>
);
