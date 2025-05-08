import { createRoot } from 'react-dom/client';
import '@src/index.css';

import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { themeStorage, transcriptStorage, addTranscript, Transcript } from '@extension/storage';
import { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { ParticipantsSection } from './components/ParticipantsSection';
import { TranscriptsSection } from './components/TranscriptsSection';
import { FilesSection } from './components/FilesSection';
import { Toast } from '@extension/ui';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { CaptureControls } from './components/CaptureControls';
import { useMessageHandler } from './hooks/useMessageHandler';
import { RuntimeMessage, MessageType, MessageSource, MessageDestination } from '@extension/shared/lib/types/runtime';
import { CaptionData, Participant } from '@extension/shared/lib/types/meeting';
import { DisplayMode, WindowState, WindowAction } from '@extension/shared/lib/types/side-panel';
import { Tab } from './types/index';
import { InsightCard } from '@extension/ui';
import moment from 'moment';
import { getProfiles, MeetingProfile, getAutoMerge } from '@extension/storage/lib/impl/optionsStorage';
import ReactMarkdown from 'react-markdown';
import 'github-markdown-css';
import { SummarySection } from './components/SummarySection';
import { ThemeProvider, useTheme, Theme } from '@extension/ui/lib/components/ThemeProvider';

const windowReducer = (state: WindowState, action: WindowAction): WindowState => {
    switch (action.type) {
        case 'SET_DISPLAY_MODE':
            return { ...state, displayMode: action.payload };
        case 'SET_POPUP_WINDOW_ID':
            return { ...state, popupWindowId: action.payload };
        case 'SET_EXPANDED':
            return { ...state, isExpanded: action.payload };
        default:
            return state;
    }
};

// Add WaitingMessage component
const WaitingMessage = () => (
    <div className={`flex flex-col items-center justify-center h-full p-4 text-gray-600 dark:text-gray-400`}>
        <div className="text-center">
            <svg
                className={`w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <h3 className={`text-lg font-medium mb-2 text-gray-900 dark:text-white`}>Waiting for Meeting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Please join a Google Meet call to start using the assistant.
            </p>
        </div>
    </div>
);

// Add grouping function
const groupCaptions = (captions: CaptionData[]) => {
    const grouped: {
        speaker: string;
        messages: { text: string; timestamp: number }[];
        firstTimestamp: number;
        lastTimestamp: number;
    }[] = [];
    let currentGroup: {
        speaker: string;
        messages: { text: string; timestamp: number }[];
        firstTimestamp: number;
        lastTimestamp: number;
    } | null = null;

    captions
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(caption => {
            const speaker = caption.speaker?.displayName || 'Unknown Speaker';
            if (
                currentGroup &&
                currentGroup.speaker === speaker &&
                caption.timestamp - currentGroup.lastTimestamp < 30000
            ) {
                currentGroup.messages.push({
                    text: caption.text,
                    timestamp: caption.timestamp,
                });
                currentGroup.lastTimestamp = caption.timestamp;
            } else {
                if (currentGroup) {
                    grouped.push(currentGroup);
                }
                currentGroup = {
                    speaker,
                    messages: [
                        {
                            text: caption.text,
                            timestamp: caption.timestamp,
                        },
                    ],
                    firstTimestamp: caption.timestamp,
                    lastTimestamp: caption.timestamp,
                };
            }
        });

    if (currentGroup) {
        grouped.push(currentGroup);
    }

    return grouped;
};

const formatTime = (timestamp: number) => {
    return moment(timestamp).format('HH:mm:ss');
};

const formatTimeRange = (start: number, end: number) => {
    return `${formatTime(start)}${start !== end ? ` - ${formatTime(end)}` : ''}`;
};

const SidePanel = () => {
    const { isInsightsActive, insights, currentInsight, removeInsight, navigateInsight } = useMessageHandler();

    // Theme state managed locally and in localStorage
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('ui-theme') as Theme) || 'light';
        }
        return 'light';
    });
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('ui-theme', theme);
        }
    }, [theme]);

    const isLight = theme === 'light';
    const [activeTab, setActiveTab] = useState<Tab>(Tab.Transcripts);
    const [showToast, setShowToast] = useState(false);
    const [showThemeToast, setShowThemeToast] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(false);
    const transcriptsContainerRef = useRef<HTMLDivElement>(null);

    const [windowState, dispatch] = useReducer(windowReducer, {
        displayMode: (() => {
            const urlParams = new URLSearchParams(window.location.search);
            return (urlParams.get('mode') as DisplayMode) || DisplayMode.SidePanel;
        })(),
        popupWindowId: null,
        isExpanded: false,
    });

    const { captions, participants, title, url, meetingId, setMeetingId, isMeetingReady } = useMessageHandler();
    const [storedTranscripts, setStoredTranscripts] = useState<Transcript[]>([]);

    // Profiles for summary generation
    const [profiles, setProfiles] = useState<MeetingProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [instructions, setInstructions] = useState('');
    const [summaryResult, setSummaryResult] = useState<{
        summary: string;
        actionItems: { title: string; description: string }[];
    }>({ summary: '', actionItems: [] });
    const [isGenerating, setIsGenerating] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Request meeting info when component mounts
    const requestMeetingInfo = async () => {
        try {
            await chrome.runtime.sendMessage({
                type: MessageType.REQUEST_MEETING_INFO,
                to: MessageDestination.inline,
                from: MessageSource.sidePanel,
            });
        } catch (error) {
            console.error('Error requesting meeting info:', error);
        }
    };
    useEffect(() => {
        console.log('meetingId -> requestMeetingInfo', meetingId);
        if (!meetingId) {
            requestMeetingInfo();
        }
    }, [meetingId]);

    // Load stored transcripts on mount
    useEffect(() => {
        const loadTranscripts = async () => {
            const transcripts = await transcriptStorage.get();
            setStoredTranscripts(transcripts);
        };
        loadTranscripts();
    }, []);

    useEffect(() => {
        getProfiles().then(profiles => {
            setProfiles(profiles);
            setSelectedProfileId(profiles[0]?.id || '');
        });
    }, []);

    const handleDownloadTranscript = useCallback(async () => {
        if (!captions.length) return;

        const transcript: Transcript = {
            meetingId: meetingId || 'default',
            title: title || 'Untitled Meeting',
            url: url || '',
            captions: captions.map(caption => ({
                timestamp: caption.timestamp,
                text: caption.text,
                speaker: caption.speaker ? { displayName: caption.speaker.displayName } : undefined,
            })),
            createdAt: Date.now(),
        };

        // Store transcript with auto-merge option
        const autoMerge = await getAutoMerge();
        await addTranscript(transcript, autoMerge);
        setStoredTranscripts(prev => [...prev, transcript]);

        // Group captions and create transcript text
        const groupedCaptions = groupCaptions(captions);
        const transcriptText = groupedCaptions
            .map(group => {
                const timeRange = formatTimeRange(group.firstTimestamp, group.lastTimestamp);
                const messages = group.messages.map(msg => msg.text).join(' ');
                return `[${timeRange}] ${group.speaker}: ${messages}`;
            })
            .join('\n\n');

        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `meeting-transcript-${meetingId || 'default'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }, [captions, meetingId, title, url]);

    const initPopupMode = useCallback(async () => {
        if (windowState.displayMode === DisplayMode.Popup) {
            setMeetingId(new URLSearchParams(window.location.search).get('meetingId') || 'default');
        }
    }, [windowState.displayMode]);

    useEffect(() => {
        if (window.opener) {
            dispatch({ type: 'SET_DISPLAY_MODE', payload: DisplayMode.Popup });
        }
    }, []);

    useEffect(() => {
        initPopupMode();
    }, [initPopupMode]);

    const handleMinimize = useCallback(async () => {
        await chrome.runtime.sendMessage({
            type: MessageType.TOGGLE,
            to: MessageDestination.inline,
        });
        window.close();
    }, []);

    const handleExpand = useCallback(async () => {
        if (windowState.popupWindowId) return;

        const width = 400;
        const height = 600;
        const left = Math.min(0, screen.width - width - 100);
        const top = Math.min(0, (screen.height - height) / 2);

        await chrome.runtime.sendMessage({
            type: MessageType.TOGGLE,
            to: MessageDestination.inline,
        });
        console.log('meetingId', meetingId);
        const window = await chrome.windows.create({
            url: chrome.runtime.getURL(`side-panel/index.html?mode=popup&meetingId=${meetingId}`),
            type: 'popup',
            width,
            height,
            left,
            top,
        });

        if (window.id) {
            dispatch({ type: 'SET_POPUP_WINDOW_ID', payload: window.id });
            chrome.windows.onRemoved.addListener(windowId => {
                if (windowId === window.id) {
                    dispatch({ type: 'SET_POPUP_WINDOW_ID', payload: null });
                }
            });
        }
    }, [windowState.popupWindowId, meetingId]);

    const getOrganizationParticipants = useCallback(() => {
        const outsideOrg = participants.filter(p => !p.parentDeviceId && false);
        const withinOrg = participants.filter(p => p.parentDeviceId && false);
        return { outsideOrg, withinOrg };
    }, [participants]);

    // Add effect to auto-scroll when captions change
    useEffect(() => {
        if (activeTab === Tab.Transcripts && transcriptsContainerRef.current) {
            const container = transcriptsContainerRef.current;
            container.scrollTop = container.scrollHeight;
        }
    }, [captions, activeTab]);

    const handleVideoToggle = useCallback(async (enabled: boolean) => {
        setVideoEnabled(enabled);
        await chrome.runtime.sendMessage({
            type: MessageType.VIDEO_TOGGLE,
            to: MessageDestination.inline,
            data: { enabled },
        });
    }, []);

    const handleOpenSettings = useCallback(() => {
        chrome.runtime.openOptionsPage();
    }, []);

    const handleTestRequest = useCallback(async () => {
        console.log('handleTestRequest');
        await chrome.runtime.sendMessage({
            type: MessageType.SCRIPT_REQUEST,
            to: MessageDestination.script,
            meetingId: meetingId || 'default',
        });
    }, [meetingId]);

    const sendMessageAsync = (message: any) => {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage(message, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    const handleGenerateSummary = async (profile: MeetingProfile, instructions: string) => {
        setIsGenerating(true);
        setSummaryError(null);
        const captionsText = captions.map(caption => caption.text).join('\n');
        try {
            const response = await sendMessageAsync({
                type: MessageType.REQUEST_GENERATE_SUMMARY,
                data: { captions: captionsText, instruction: instructions, profile },
                to: MessageDestination.background,
                from: MessageSource.sidePanel,
            });
            if ((response as any).error) {
                const error = (response as any).error;
                setSummaryError(error.message || error);
                setIsGenerating(false);
                return;
            }
            setSummaryResult({
                summary: (response as any).summary,
                actionItems: (response as any).actionItems || [],
            });
        } catch (err: any) {
            setSummaryError(err.message || err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <ThemeProvider>
            <div className={`flex flex-col h-full bg-white dark:bg-gray-900`}>
                <Header
                    title={title || ''}
                    url={url || ''}
                    onMinimize={handleMinimize}
                    onExpand={handleExpand}
                    isExpanded={windowState.isExpanded}
                />
                {isMeetingReady ? (
                    <>
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
                                    <TranscriptsSection
                                        captions={captions}
                                        onDownload={handleDownloadTranscript}
                                        isLight={isLight}
                                    />
                                </>
                            )}
                            {activeTab === Tab.Participants && (
                                <ParticipantsSection participants={participants} isLight={isLight} />
                            )}
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
                        {/* <CaptureControls
                            audioEnabled={audioEnabled}
                            videoEnabled={videoEnabled}
                            onAudioToggle={() => setAudioEnabled(!audioEnabled)}
                            onVideoToggle={() => setVideoEnabled(!videoEnabled)}
                            meetingId={meetingId || 'default'}
                        /> */}
                    </>
                ) : (
                    <WaitingMessage />
                )}
                {showToast && (
                    <Toast
                        message="Transcript downloaded successfully!"
                        isVisible={showToast}
                        onClose={() => setShowToast(false)}
                    />
                )}
                {showThemeToast && (
                    <Toast
                        message={`Theme set to ${theme}`}
                        isVisible={showThemeToast}
                        onClose={() => setShowThemeToast(false)}
                    />
                )}
            </div>
        </ThemeProvider>
    );
};

const App = withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occured </div>);

function init() {
    const appContainer = document.querySelector('#app-container');
    if (!appContainer) {
        throw new Error('Can not find #app-container');
    }
    const root = createRoot(appContainer);

    root.render(<App />);
}

init();
