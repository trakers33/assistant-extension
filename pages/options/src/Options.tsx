import '@src/index.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import {
    optionsStorage,
    transcriptStorage,
    getTranscripts,
    clearTranscripts,
    Transcript,
    getWebSocketConfig,
    setWebSocketConfig,
    WebSocketConfig,
    getProfiles,
    setProfiles,
    MeetingProfile,
    themeStorage,
} from '@extension/storage';
import { Toast } from '@extension/ui';
import { InsightsToggle } from '@extension/ui/lib/components/InsightsToggle';
import { t } from '@extension/i18n';
import { useState, useEffect, useRef } from 'react';
import { MessageType, MessageSource, MessageDestination } from '@extension/shared/lib/types/runtime';
import { Markdown } from '@extension/ui/lib/components';
import { v4 as uuidv4 } from 'uuid';
import { ThemeProvider, useTheme } from '@extension/ui/lib/components/ThemeProvider';

const Options = () => {
    // Theme state managed locally and in localStorage

    const options = useStorage(optionsStorage);
    const theme = useStorage(themeStorage);
    console.log('theme -->', theme);
    const isLight = theme === 'light';
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [wsConfig, setWsConfig] = useState<WebSocketConfig>({
        endpoint: '',
        enabled: false,
    });
    const [showToast, setShowToast] = useState(false);
    const [profiles, setProfilesState] = useState<MeetingProfile[]>([]);
    const [profileErrors, setProfileErrors] = useState<{ [id: string]: Partial<Record<keyof MeetingProfile, string>> }>(
        {},
    );
    const [profileToast, setProfileToast] = useState(false);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const [openAIApiKey, setOpenAIApiKey] = useState(options.openAIApiKey || '');
    const [showKeySaved, setShowKeySaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'settings' | 'transcripts' | 'profiles'>('settings');
    const [selectedProfileIdx, setSelectedProfileIdx] = useState(0);
    const saveProfilesTimeout = useRef<NodeJS.Timeout | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewedTranscript, setViewedTranscript] = useState<Transcript | null>(null);
    const [summaryProfileId, setSummaryProfileId] = useState<string>('');
    const [summaryInstructions, setSummaryInstructions] = useState('');
    const [summaryResult, setSummaryResult] = useState<{
        summary: string;
        actionItems: { title: string; description: string; probability?: number }[];
    }>({ summary: '', actionItems: [] });
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [modalTab, setModalTab] = useState<'config' | 'preview' | 'actions'>('config');
    const generationRequestId = useRef<string | null>(null);

    useEffect(() => {
        const loadConfig = async () => {
            const savedConfig = await getWebSocketConfig();
            setWsConfig(savedConfig);
            const loadedTranscripts = await getTranscripts();
            setTranscripts(loadedTranscripts);
            const loadedProfiles = await getProfiles();
            setProfilesState(loadedProfiles);
        };
        loadConfig();
    }, []);

    const handleSaveWsConfig = async () => {
        await setWebSocketConfig(wsConfig);
        setShowToast(true);
    };

    const handleDeleteTranscript = async (index: number) => {
        const updatedTranscripts = [...transcripts];
        updatedTranscripts.splice(index, 1);
        await transcriptStorage.set(updatedTranscripts);
        setTranscripts(updatedTranscripts);
    };

    const handleDownloadTranscript = (transcript: Transcript) => {
        const transcriptText = transcript.captions
            .map(caption => {
                const date = new Date(caption.timestamp);
                const timeStr = date.toLocaleTimeString();
                return `[${timeStr}] ${caption.speaker ? `${caption.speaker}: ` : ''}${caption.text}`;
            })
            .join('\n');

        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `meeting-transcript-${transcript.meetingId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    };

    const groupTranscriptsByDate = () => {
        const groups: { [key: string]: Transcript[] } = {};
        transcripts.forEach(transcript => {
            const date = new Date(transcript.createdAt).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(transcript);
        });
        return groups;
    };

    const groupedTranscripts = groupTranscriptsByDate();

    // Validation helpers
    const validateProfile = (
        profile: MeetingProfile,
        allProfiles: MeetingProfile[],
    ): Partial<Record<keyof MeetingProfile, string>> => {
        const errors: Partial<Record<keyof MeetingProfile, string>> = {};
        if (!profile.name.trim()) errors.name = 'Profile name is required.';
        if (!profile.userName.trim()) errors.userName = 'User name is required.';
        if (!profile.objective.trim()) errors.objective = 'Objective is required.';
        if (!profile.structure.trim()) errors.structure = 'Structure is required.';
        if (!profile.tone?.trim()) errors.tone = 'Tone is required.';
        if (!profile.language?.trim()) errors.language = 'Language is required.';
        if (!profile.audience?.trim()) errors.audience = 'Audience is required.';
        if (allProfiles.filter(p => p.name.trim() === profile.name.trim()).length > 1)
            errors.name = 'Profile name must be unique.';
        return errors;
    };

    const validateAllProfiles = (profiles: MeetingProfile[]) => {
        const allErrors: { [id: string]: Partial<Record<keyof MeetingProfile, string>> } = {};
        profiles.forEach(profile => {
            const errors = validateProfile(profile, profiles);
            if (Object.keys(errors).length > 0) allErrors[profile.id] = errors;
        });
        setProfileErrors(allErrors);
        return allErrors;
    };

    useEffect(() => {
        validateAllProfiles(profiles);
    }, [profiles]);

    const saveProfilesDebounced = (updatedProfiles: MeetingProfile[]) => {
        if (saveProfilesTimeout.current) {
            clearTimeout(saveProfilesTimeout.current);
        }
        saveProfilesTimeout.current = setTimeout(async () => {
            await setProfiles(updatedProfiles);
            setProfileToast(true);
        }, 1000); // 1 second debounce
    };

    const handleProfileChange = (index: number, field: keyof MeetingProfile, value: string) => {
        const updated = profiles.map((profile, i) => (i === index ? { ...profile, [field]: value } : profile));
        setProfilesState(updated);
        const allErrors = validateAllProfiles(updated);
        if (Object.keys(allErrors).length === 0) {
            saveProfilesDebounced(updated);
        }
    };

    const handleAddProfile = () => {
        const newProfile: MeetingProfile = {
            id: `profile-${Date.now()}`,
            name: '',
            userName: '',
            objective: '',
            structure: '',
        };
        const updated = [...profiles, newProfile];
        setProfilesState(updated);
        validateAllProfiles(updated);
        setTimeout(() => {
            addBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleDeleteProfile = (index: number) => {
        const updated = profiles.filter((_, i) => i !== index);
        setProfilesState(updated);
        setProfiles(updated);
        setProfileToast(true);
    };

    const isProfileValid = (profile: MeetingProfile) => {
        const errors = validateProfile(profile, profiles);
        return Object.keys(errors).length === 0;
    };

    const canAddProfile = profiles.length === 0 || isProfileValid(profiles[profiles.length - 1]);

    const handleSaveOpenAIApiKey = async () => {
        await optionsStorage.set(current => ({ ...current, openAIApiKey }));
        setShowKeySaved(true);
        setTimeout(() => setShowKeySaved(false), 2000);
    };

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

    const handleViewTranscript = (transcript: Transcript) => {
        console.log('handleViewTranscript', transcript);
        setViewedTranscript(transcript);
        setViewModalOpen(true);
        setSummaryProfileId(profiles[0]?.id || '');
        setSummaryInstructions('');
        if (transcript.summary && transcript.summary.summary != '') {
            setSummaryResult({
                summary: transcript.summary.summary,
                actionItems: transcript.summary.actionItems || [],
            });
            setModalTab('preview');
        } else {
            setSummaryResult({ summary: '', actionItems: [] });
            setModalTab('config');
        }
        setSummaryError(null);
    };

    const handleCloseModal = () => {
        setViewModalOpen(false);
        setViewedTranscript(null);
        setSummaryResult({ summary: '', actionItems: [] });
        setSummaryError(null);
    };

    const handleGenerateSummaryFromModal = async () => {
        if (!viewedTranscript) return;
        setSummaryLoading(true);
        setSummaryError(null);
        const profile = profiles.find(p => p.id === summaryProfileId) || profiles[0];
        const captions = viewedTranscript.captions.map(caption => caption.text).join('\n');
        const requestId = uuidv4();
        generationRequestId.current = requestId;
        try {
            const response = await sendMessageAsync({
                type: MessageType.REQUEST_GENERATE_SUMMARY,
                data: { captions, instruction: summaryInstructions, profile, requestId },
                from: MessageSource.option,
                to: MessageDestination.background,
            });
            console.log('responseresponseresponse', response);
            if (response.error) {
                console.error('Error generating summary', response.error);
                const error = response.error;
                setSummaryError(error.message || error);
                return;
            }
            const newSummary = {
                summary: (response as any).summary,
                actionItems: (response as any).actionItems || [],
            };
            setSummaryResult(newSummary);
            // Update the transcript in storage
            const updatedTranscripts = transcripts.map(t =>
                t.meetingId === viewedTranscript.meetingId ? { ...t, summary: newSummary } : t,
            );
            await transcriptStorage.set(updatedTranscripts);
            setTranscripts(updatedTranscripts);
            setModalTab('preview');
        } catch (err: any) {
            setSummaryError(err.message || err);
        } finally {
            setSummaryLoading(false);
            generationRequestId.current = null;
        }
    };

    const handleCancelGeneration = async () => {
        if (generationRequestId.current) {
            await sendMessageAsync({
                type: MessageType.CANCEL_GENERATE_SUMMARY,
                data: { requestId: generationRequestId.current },
                from: MessageSource.option,
                to: MessageDestination.background,
            });
            setSummaryLoading(false);
            generationRequestId.current = null;
        }
    };

    const handleCopySummary = async () => {
        if (summaryResult.summary) {
            await navigator.clipboard.writeText(summaryResult.summary);
        }
    };

    useEffect(() => {
        if (viewModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [viewModalOpen]);

    return (
        <ThemeProvider>
            <div className={`min-h-screen p-8 bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold">Extension Administration</h1>
                        <button
                            onClick={() => themeStorage.toggle()}
                            className={`p-2 rounded-md transition-all duration-300 transform hover:scale-110 ${
                                isLight
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-gray-800 text-white hover:bg-gray-700'
                            }`}
                            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}>
                            {isLight ? (
                                // Moon icon
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            ) : (
                                // Sun icon
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                    {/* Tab Navigation */}
                    <div className="flex border-b mb-8">
                        <button
                            className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-200'}`}
                            onClick={() => setActiveTab('settings')}>
                            Settings
                        </button>
                        <button
                            className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'profiles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-200'}`}
                            onClick={() => setActiveTab('profiles')}>
                            Profile Management
                        </button>
                        <button
                            className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'transcripts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-200'}`}
                            onClick={() => setActiveTab('transcripts')}>
                            Saved Transcripts
                        </button>
                    </div>
                    {/* Tab Content */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Settings Section */}
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
                                <div className="space-y-4">
                                    {/* Auto Captions Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div className="text-left">
                                            <h3 className="font-medium text-left">Auto-enable captions</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Automatically turn on captions when joining a meeting
                                            </p>
                                        </div>
                                        <InsightsToggle
                                            isActive={!!options.autoCaptions}
                                            onToggle={() =>
                                                optionsStorage.set(current => ({
                                                    ...current,
                                                    autoCaptions: !current.autoCaptions,
                                                }))
                                            }
                                        />
                                    </div>
                                    {/* Auto Merge Toggle */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center justify-between">
                                            <div className="text-left">
                                                <h3 className="font-medium text-left">Auto Merge Transcripts</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Automatically merge meeting transcripts for the same meeting
                                                </p>
                                            </div>
                                            <InsightsToggle
                                                isActive={!!options.autoMerge}
                                                onToggle={() =>
                                                    optionsStorage.set(current => ({
                                                        ...current,
                                                        autoMerge: !current.autoMerge,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    {/* WebSocket Configuration */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <h3 className="font-medium text-left">WebSocket Streaming</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Enable real-time streaming of meeting data
                                                    </p>
                                                </div>
                                                <InsightsToggle
                                                    isActive={!!wsConfig.enabled}
                                                    onToggle={() =>
                                                        setWsConfig({ ...wsConfig, enabled: !wsConfig.enabled })
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    className={`block text-sm font-medium text-gray-900 dark:text-gray-100`}>
                                                    WebSocket Endpoint
                                                </label>
                                                <input
                                                    type="text"
                                                    value={wsConfig.endpoint}
                                                    onChange={e =>
                                                        setWsConfig({ ...wsConfig, endpoint: e.target.value })
                                                    }
                                                    placeholder="ws://your-endpoint.com"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSaveWsConfig}
                                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                                Save WebSocket Configuration
                                            </button>
                                        </div>
                                    </div>
                                    {/* OpenAI API Key */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <label className={`block text-sm font-medium text-gray-900 dark:text-gray-100`}>
                                            OpenAI API Key
                                        </label>
                                        <input
                                            type="password"
                                            value={openAIApiKey}
                                            onChange={e => setOpenAIApiKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        />
                                        <button
                                            onClick={handleSaveOpenAIApiKey}
                                            className="mt-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                            Save API Key
                                        </button>
                                        {showKeySaved && (
                                            <span className="ml-2 text-green-600 text-sm">Key saved!</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'profiles' && (
                        <div className="flex flex-row gap-8 items-start w-full">
                            {/* Vertical Tabs */}
                            <div className="flex flex-col w-56 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 gap-2 mt-6">
                                {profiles.map((profile, idx) => (
                                    <button
                                        key={profile.id}
                                        className={`text-left px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 mb-1 ${selectedProfileIdx === idx ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-transparent hover:bg-blue-50 dark:hover:bg-blue-800'}`}
                                        onClick={() => setSelectedProfileIdx(idx)}>
                                        {profile.name || 'Untitled'}
                                    </button>
                                ))}
                                <button
                                    ref={addBtnRef}
                                    className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-sm transition-all"
                                    onClick={handleAddProfile}
                                    disabled={!canAddProfile}>
                                    Add Profile
                                </button>
                            </div>
                            {/* Profile Card */}
                            {profiles[selectedProfileIdx] && (
                                <div className="flex-1 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 flex flex-col gap-6 mt-6 transition-shadow hover:shadow-lg relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex flex-col w-full">
                                                <label
                                                    htmlFor={`profile-name-${profiles[selectedProfileIdx].id}`}
                                                    className={`block text-sm font-semibold text-gray-900 dark:text-gray-100`}>
                                                    Profile Name
                                                </label>
                                                <div className="flex items-center gap-3 w-full">
                                                    <input
                                                        id={`profile-name-${profiles[selectedProfileIdx].id}`}
                                                        className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none text-base font-medium ${profileErrors[profiles[selectedProfileIdx].id]?.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800 transition-all`}
                                                        value={profiles[selectedProfileIdx].name}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Profile Name"
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.name
                                                        }
                                                        aria-describedby={`profile-name-error-${profiles[selectedProfileIdx].id}`}
                                                    />
                                                    <button
                                                        className="px-3 py-2 border border-red-200 text-red-500 rounded-lg font-medium text-sm hover:bg-red-50 hover:border-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200 h-full"
                                                        onClick={() => handleDeleteProfile(selectedProfileIdx)}
                                                        disabled={profiles.length <= 1}
                                                        title={
                                                            profiles.length <= 1
                                                                ? 'At least one profile required'
                                                                : 'Delete profile'
                                                        }>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            {profileErrors[profiles[selectedProfileIdx].id]?.name && (
                                                <span
                                                    id={`profile-name-error-${profiles[selectedProfileIdx].id}`}
                                                    className="text-xs text-red-600">
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.name}
                                                </span>
                                            )}
                                            <hr className="my-2 border-gray-200 dark:border-gray-700" />
                                            <div className="flex flex-col gap-4">
                                                <div className="flex flex-col">
                                                    <label
                                                        htmlFor={`profile-username-${profiles[selectedProfileIdx].id}`}
                                                        className={`block text-sm font-semibold mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                        User Name
                                                    </label>
                                                    <input
                                                        id={`profile-username-${profiles[selectedProfileIdx].id}`}
                                                        className={`px-3 py-2 rounded border focus:outline-none ${profileErrors[profiles[selectedProfileIdx].id]?.userName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800`}
                                                        value={profiles[selectedProfileIdx].userName}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'userName',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="User Name"
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.userName
                                                        }
                                                        aria-describedby={`profile-username-error-${profiles[selectedProfileIdx].id}`}
                                                    />
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.userName && (
                                                        <span
                                                            id={`profile-username-error-${profiles[selectedProfileIdx].id}`}
                                                            className="text-xs text-red-600">
                                                            {profileErrors[profiles[selectedProfileIdx].id]?.userName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <label
                                                        htmlFor={`profile-objective-${profiles[selectedProfileIdx].id}`}
                                                        className={`block text-sm font-semibold mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                        Objective
                                                    </label>
                                                    <textarea
                                                        id={`profile-objective-${profiles[selectedProfileIdx].id}`}
                                                        className={`px-3 py-2 rounded border focus:outline-none resize-y min-h-[48px] ${profileErrors[profiles[selectedProfileIdx].id]?.objective ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800`}
                                                        value={profiles[selectedProfileIdx].objective}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'objective',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Objective"
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.objective
                                                        }
                                                        aria-describedby={`profile-objective-error-${profiles[selectedProfileIdx].id}`}
                                                    />
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.objective && (
                                                        <span
                                                            id={`profile-objective-error-${profiles[selectedProfileIdx].id}`}
                                                            className="text-xs text-red-600">
                                                            {profileErrors[profiles[selectedProfileIdx].id]?.objective}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <label
                                                        htmlFor={`profile-structure-${profiles[selectedProfileIdx].id}`}
                                                        className={`block text-sm font-semibold mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                        Structure
                                                    </label>
                                                    <textarea
                                                        id={`profile-structure-${profiles[selectedProfileIdx].id}`}
                                                        className={`px-3 py-2 rounded border focus:outline-none resize-y min-h-[48px] ${profileErrors[profiles[selectedProfileIdx].id]?.structure ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800`}
                                                        value={profiles[selectedProfileIdx].structure}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'structure',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Structure"
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.structure
                                                        }
                                                        aria-describedby={`profile-structure-error-${profiles[selectedProfileIdx].id}`}
                                                    />
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.structure && (
                                                        <span
                                                            id={`profile-structure-error-${profiles[selectedProfileIdx].id}`}
                                                            className="text-xs text-red-600">
                                                            {profileErrors[profiles[selectedProfileIdx].id]?.structure}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <label
                                                        htmlFor={`profile-tone-${profiles[selectedProfileIdx].id}`}
                                                        className={`block text-sm font-semibold mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                        Tone
                                                    </label>
                                                    <select
                                                        id={`profile-tone-${profiles[selectedProfileIdx].id}`}
                                                        className={`px-3 py-2 rounded border focus:outline-none ${profileErrors[profiles[selectedProfileIdx].id]?.tone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800`}
                                                        value={profiles[selectedProfileIdx].tone || ''}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'tone',
                                                                e.target.value,
                                                            )
                                                        }
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.tone
                                                        }
                                                        aria-describedby={`profile-tone-error-${profiles[selectedProfileIdx].id}`}>
                                                        {[
                                                            'Neutral',
                                                            'Formal',
                                                            'Informal',
                                                            'Friendly',
                                                            'Concise',
                                                            'Detailed',
                                                            'Professional',
                                                            'Empathetic',
                                                        ].map(option => (
                                                            <option key={option} value={option.toLowerCase()}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                        {profiles[selectedProfileIdx].tone &&
                                                            ![
                                                                'neutral',
                                                                'formal',
                                                                'informal',
                                                                'friendly',
                                                                'concise',
                                                                'detailed',
                                                                'professional',
                                                                'empathetic',
                                                            ].includes(
                                                                profiles[selectedProfileIdx].tone.toLowerCase(),
                                                            ) && (
                                                                <option value={profiles[selectedProfileIdx].tone}>
                                                                    {profiles[selectedProfileIdx].tone}
                                                                </option>
                                                            )}
                                                    </select>
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.tone && (
                                                        <span
                                                            id={`profile-tone-error-${profiles[selectedProfileIdx].id}`}
                                                            className="text-xs text-red-600">
                                                            {profileErrors[profiles[selectedProfileIdx].id]?.tone}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <label
                                                        htmlFor={`profile-language-${profiles[selectedProfileIdx].id}`}
                                                        className={`block text-sm font-semibold mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                        Language
                                                    </label>
                                                    <select
                                                        id={`profile-language-${profiles[selectedProfileIdx].id}`}
                                                        className={`px-3 py-2 rounded border focus:outline-none ${profileErrors[profiles[selectedProfileIdx].id]?.language ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800`}
                                                        value={profiles[selectedProfileIdx].language || ''}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'language',
                                                                e.target.value,
                                                            )
                                                        }
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.language
                                                        }
                                                        aria-describedby={`profile-language-error-${profiles[selectedProfileIdx].id}`}>
                                                        {[
                                                            'English',
                                                            'Spanish',
                                                            'French',
                                                            'German',
                                                            'Italian',
                                                            'Portuguese',
                                                            'Dutch',
                                                            'Chinese',
                                                            'Japanese',
                                                            'Korean',
                                                            'Russian',
                                                            'Arabic',
                                                        ].map(option => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                        {profiles[selectedProfileIdx].language &&
                                                            ![
                                                                'English',
                                                                'Spanish',
                                                                'French',
                                                                'German',
                                                                'Italian',
                                                                'Portuguese',
                                                                'Dutch',
                                                                'Chinese',
                                                                'Japanese',
                                                                'Korean',
                                                                'Russian',
                                                                'Arabic',
                                                            ].includes(profiles[selectedProfileIdx].language) && (
                                                                <option value={profiles[selectedProfileIdx].language}>
                                                                    {profiles[selectedProfileIdx].language}
                                                                </option>
                                                            )}
                                                    </select>
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.language && (
                                                        <span
                                                            id={`profile-language-error-${profiles[selectedProfileIdx].id}`}
                                                            className="text-xs text-red-600">
                                                            {profileErrors[profiles[selectedProfileIdx].id]?.language}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <label
                                                        htmlFor={`profile-audience-${profiles[selectedProfileIdx].id}`}
                                                        className={`block text-sm font-semibold mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                        Audience
                                                    </label>
                                                    <input
                                                        id={`profile-audience-${profiles[selectedProfileIdx].id}`}
                                                        className={`px-3 py-2 rounded border focus:outline-none ${profileErrors[profiles[selectedProfileIdx].id]?.audience ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-800`}
                                                        value={profiles[selectedProfileIdx].audience || ''}
                                                        onChange={e =>
                                                            handleProfileChange(
                                                                selectedProfileIdx,
                                                                'audience',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Audience (e.g., Executives, Developers)"
                                                        aria-invalid={
                                                            !!profileErrors[profiles[selectedProfileIdx].id]?.audience
                                                        }
                                                        aria-describedby={`profile-audience-error-${profiles[selectedProfileIdx].id}`}
                                                    />
                                                    {profileErrors[profiles[selectedProfileIdx].id]?.audience && (
                                                        <span
                                                            id={`profile-audience-error-${profiles[selectedProfileIdx].id}`}
                                                            className="text-xs text-red-600">
                                                            {profileErrors[profiles[selectedProfileIdx].id]?.audience}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 bg-gray-100 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 text-blue-400 flex-shrink-0"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                                                    />
                                                </svg>
                                                <span>
                                                    Profile Name must be unique and not empty. User Name, Objective,
                                                    Structure, Tone, Language, and Audience are required.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <Toast
                                message="Profiles saved!"
                                isVisible={profileToast}
                                onClose={() => setProfileToast(false)}
                                isLight={isLight}
                            />
                        </div>
                    )}
                    {activeTab === 'transcripts' && (
                        <div className={`rounded-lg p-6 shadow-sm bg-white dark:bg-gray-900`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className={`text-lg font-semibold text-gray-900 dark:text-gray-100`}>
                                    Saved Transcripts
                                </h2>
                                <button
                                    onClick={() => clearTranscripts().then(() => setTranscripts([]))}
                                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                    Clear All
                                </button>
                            </div>
                            {Object.entries(groupedTranscripts)
                                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                                .map(([date, dateTranscripts]) => (
                                    <div key={date} className="mb-4">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            {date}
                                        </h3>
                                        <div className="space-y-2">
                                            {dateTranscripts
                                                .slice()
                                                .sort(
                                                    (a, b) =>
                                                        new Date(b.createdAt).getTime() -
                                                        new Date(a.createdAt).getTime(),
                                                )
                                                .map((transcript, index) => (
                                                    <div
                                                        key={transcript.meetingId}
                                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-600 rounded-md">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium">{transcript.title}</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {transcript.url}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleDownloadTranscript(transcript)}
                                                                className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                                                                Download
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTranscript(index)}
                                                                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                                                Delete
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewTranscript(transcript)}
                                                                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700">
                                                                View
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            {transcripts.length === 0 && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                                    No transcripts saved yet
                                </p>
                            )}
                            {/* Modal for viewing transcript and generating summary */}
                            {viewModalOpen && viewedTranscript && (
                                <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black bg-opacity-40">
                                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-4xl w-full h-full max-h-screen flex flex-col p-10 relative">
                                        <button
                                            onClick={handleCloseModal}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl font-bold focus:outline-none"
                                            aria-label="Close">
                                            ×
                                        </button>
                                        {/* Tabs */}
                                        <div className="flex mb-6 border-b">
                                            <button
                                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${modalTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setModalTab('config')}>
                                                Configuration
                                            </button>
                                            <button
                                                className={`ml-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${modalTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setModalTab('preview')}>
                                                Preview
                                            </button>
                                            <button
                                                className={`ml-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${modalTab === 'actions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                                onClick={() => setModalTab('actions')}>
                                                Actions
                                            </button>
                                        </div>

                                        {/* Tab content */}
                                        {modalTab === 'config' && (
                                            <>
                                                <h3 className="text-2xl font-semibold mb-4">
                                                    Transcript: {viewedTranscript.title}
                                                </h3>
                                                <div className="max-h-80 overflow-y-auto bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm mb-6 whitespace-pre-line text-left">
                                                    {viewedTranscript.captions.map((caption, idx) => (
                                                        <div key={idx} className="mb-1">
                                                            <span className="text-gray-500">
                                                                [{new Date(caption.timestamp).toLocaleTimeString()}]
                                                            </span>{' '}
                                                            <span className="font-medium">
                                                                {caption.speaker && caption.speaker.displayName
                                                                    ? caption.speaker.displayName + ': '
                                                                    : 'Unknown Speaker: '}
                                                            </span>
                                                            {caption.text}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mb-6 flex flex-row gap-6 flex-wrap md:flex-nowrap">
                                                    <div className="flex-1 min-w-[200px] md:basis-1/2 md:max-w-[50%]">
                                                        <label
                                                            className={`block text-sm font-medium mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                            Profile
                                                        </label>
                                                        <select
                                                            value={summaryProfileId}
                                                            onChange={e => setSummaryProfileId(e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md focus:outline-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                                            {profiles.map(profile => (
                                                                <option key={profile.id} value={profile.id}>
                                                                    {profile.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="mb-12 flex flex-row gap-6 flex-wrap md:flex-nowrap">
                                                    <div className="flex-1 min-w-[200px]">
                                                        <label
                                                            className={`block text-sm font-medium mb-1 text-left text-gray-900 dark:text-gray-100`}>
                                                            Instructions
                                                        </label>
                                                        <textarea
                                                            value={summaryInstructions}
                                                            onChange={e => setSummaryInstructions(e.target.value)}
                                                            placeholder="Add custom instructions..."
                                                            className="w-full px-3 py-2 border rounded-md focus:outline-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 resize-y min-h-[40px]"
                                                        />
                                                    </div>
                                                </div>
                                                {!viewedTranscript?.summary || summaryResult.summary === '' ? (
                                                    <button
                                                        onClick={handleGenerateSummaryFromModal}
                                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                                                        disabled={summaryLoading}>
                                                        {summaryLoading ? 'Generating...' : 'Generate Summary'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleGenerateSummaryFromModal}
                                                        className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 mb-4"
                                                        disabled={summaryLoading}>
                                                        {summaryLoading ? 'Regenerating...' : 'Regenerate Summary'}
                                                    </button>
                                                )}
                                                {summaryError && (
                                                    <div className="text-red-600 text-sm mb-2">{summaryError}</div>
                                                )}
                                            </>
                                        )}
                                        {modalTab === 'preview' && (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                        Generated Summary
                                                    </h2>
                                                    <button
                                                        onClick={handleCopySummary}
                                                        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg shadow hover:bg-blue-200 dark:hover:bg-blue-700 border border-blue-200 dark:border-blue-700 transition-all font-semibold"
                                                        title="Copy to clipboard">
                                                        Copy
                                                    </button>
                                                </div>
                                                <div className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 overflow-y-auto flex flex-col gap-6">
                                                    {summaryLoading ? (
                                                        <div className="flex flex-col items-center justify-center py-8">
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
                                                            <span className="text-blue-600 text-base font-medium mb-4 text-center">
                                                                Hang tight! Your summary is being generated. This may
                                                                take a few moments depending on the meeting length.
                                                            </span>
                                                            <button
                                                                onClick={handleCancelGeneration}
                                                                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : summaryError ? (
                                                        <div className="text-red-600 text-sm w-full flex items-center justify-center">
                                                            {summaryError}
                                                        </div>
                                                    ) : summaryResult.summary ? (
                                                        <Markdown
                                                            content={summaryResult.summary}
                                                            className="bg-gray-50 dark:bg-gray-800 text-left overflow-y-auto"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400">No summary generated yet.</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {modalTab === 'actions' && (
                                            <div className="pt-2">
                                                <h3 className="text-lg font-semibold mb-4">Action Items</h3>
                                                {summaryResult.actionItems && summaryResult.actionItems.length > 0 ? (
                                                    <div className="flex flex-col gap-2 w-full">
                                                        {summaryResult.actionItems.map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="w-full border border-blue-200 dark:border-blue-800 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 shadow-sm flex flex-row items-start gap-3 transition hover:shadow-md">
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
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className="font-semibold text-blue-900 dark:text-blue-100 text-base">
                                                                            {item.title}
                                                                        </div>
                                                                        {typeof item.probability === 'number' && (
                                                                            <span
                                                                                className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100 ml-1"
                                                                                title="Probability this action item is required">
                                                                                {(item.probability * 100).toFixed(0)}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-line">
                                                                        <Markdown content={item.description} />
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
                                                    <div className="text-gray-500 dark:text-gray-400">
                                                        No action items generated yet.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Toast
                    message="WebSocket configuration saved!"
                    isVisible={showToast}
                    onClose={() => setShowToast(false)}
                    isLight={isLight}
                />
            </div>
        </ThemeProvider>
    );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
