import '@src/Options.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { optionsStorage, transcriptStorage, getTranscripts, clearTranscripts, Transcript, getWebSocketConfig, setWebSocketConfig, WebSocketConfig } from '@extension/storage';
import { ToggleButton, Toast } from '@extension/ui';
import { t } from '@extension/i18n';
import { useState, useEffect } from 'react';

const Options = () => {
    const options = useStorage(optionsStorage);
    const isLight = options.theme === 'light';
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [wsConfig, setWsConfig] = useState<WebSocketConfig>({
        endpoint: '',
        enabled: false
    });
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const savedConfig = await getWebSocketConfig();
            setWsConfig(savedConfig);
            const loadedTranscripts = await getTranscripts();
            setTranscripts(loadedTranscripts);
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

    return (
        <div className={`min-h-screen p-8 ${isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100'}`}>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-8">Extension Settings</h1>

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
                                <ToggleButton
                                    onClick={() => optionsStorage.set(current => ({
                                        ...current,
                                        autoCaptions: !current.autoCaptions
                                    }))}
                                    className="!mt-0 min-w-[80px]">
                                    {options.autoCaptions ? 'On' : 'Off'}
                                </ToggleButton>
                            </div>

                            {/* Theme Toggle */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                                <div className="text-left">
                                    <h3 className="font-medium text-left">Theme</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Choose between light and dark mode
                                    </p>
                                </div>
                                <ToggleButton 
                                    onClick={() => optionsStorage.set(current => ({
                                        ...current,
                                        theme: current.theme === 'light' ? 'dark' : 'light'
                                    }))} 
                                    className="!mt-0 min-w-[80px]">
                                    {options.theme === 'light' ? 'Light' : 'Dark'}
                                </ToggleButton>
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
                                        <ToggleButton
                                            onClick={() => setWsConfig({ ...wsConfig, enabled: !wsConfig.enabled })}
                                            className="!mt-0 min-w-[80px]">
                                            {wsConfig.enabled ? 'On' : 'Off'}
                                        </ToggleButton>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            WebSocket Endpoint
                                        </label>
                                        <input
                                            type="text"
                                            value={wsConfig.endpoint}
                                            onChange={(e) => setWsConfig({ ...wsConfig, endpoint: e.target.value })}
                                            placeholder="ws://your-endpoint.com"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveWsConfig}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Save WebSocket Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transcripts Section */}
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Saved Transcripts</h2>
                            <button
                                onClick={() => clearTranscripts().then(() => setTranscripts([]))}
                                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                                Clear All
                            </button>
                        </div>
                        {Object.entries(groupedTranscripts).map(([date, dateTranscripts]) => (
                            <div key={date} className="mb-4">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{date}</h3>
                                <div className="space-y-2">
                                    {dateTranscripts.map((transcript, index) => (
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
                    </div>
                </div>
            </div>

            <Toast
                message="WebSocket configuration saved!"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
                isLight={isLight}
            />
        </div>
    );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
