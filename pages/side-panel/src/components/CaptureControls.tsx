import { Switch } from '@headlessui/react';
import { MessageType, MessageDestination } from '@extension/shared/lib/types/runtime';

interface CaptureControlsProps {
    isLight: boolean;
    audioEnabled: boolean;
    videoEnabled: boolean;
    onAudioToggle: () => void;
    onVideoToggle: () => void;
    meetingId?: string;
}

export const CaptureControls = ({
    isLight,
    audioEnabled,
    videoEnabled,
    onAudioToggle,
    onVideoToggle,
    meetingId,
}: CaptureControlsProps) => {
    const handleStartCapturing = () => {
        console.log('handleStartCapturing', meetingId);
        if (!meetingId) return;
        
        chrome.runtime.sendMessage({
            type: MessageType.START_CAPTURING,
            to: MessageDestination.script,
            meetingId,
        });
    };

    return (
        <div className={`border-t ${
            isLight 
                ? 'bg-white border-gray-200' 
                : 'bg-gray-900 border-gray-700'
        }`}>
            <div className="px-4 py-3">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                            <svg 
                                className={`h-5 w-5 ${isLight ? 'text-gray-500' : 'text-white'}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                            </svg>
                            <span className={`text-sm font-medium ${
                                isLight ? 'text-gray-900' : 'text-white'
                            }`}>
                                Audio Capture
                            </span>
                            <Switch
                                checked={audioEnabled}
                                onChange={onAudioToggle}
                                className={`${
                                    audioEnabled ? 'bg-blue-600' : isLight ? 'bg-gray-300' : 'bg-gray-600'
                                } relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out`}>
                                <span
                                    className={`${
                                        audioEnabled ? 'translate-x-4' : 'translate-x-0'
                                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out`}
                                />
                            </Switch>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <svg 
                                className={`h-5 w-5 ${isLight ? 'text-gray-500' : 'text-white'}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                            <span className={`text-sm font-medium ${
                                isLight ? 'text-gray-900' : 'text-white'
                            }`}>
                                Video Capture
                            </span>
                            <Switch
                                checked={videoEnabled}
                                onChange={onVideoToggle}
                                className={`${
                                    videoEnabled ? 'bg-blue-600' : isLight ? 'bg-gray-300' : 'bg-gray-600'
                                } relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out`}>
                                <span
                                    className={`${
                                        videoEnabled ? 'translate-x-4' : 'translate-x-0'
                                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out`}
                                />
                            </Switch>
                        </div>
                    </div>
                    <button
                        onClick={handleStartCapturing}
                        className={`w-full py-2 px-4 rounded-md ${
                            isLight
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        } font-medium transition-colors duration-200`}
                    >
                        Start Capturing
                    </button>
                </div>
            </div>
        </div>
    );
};
