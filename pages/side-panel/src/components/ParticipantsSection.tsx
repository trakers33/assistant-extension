import React from 'react';
import { ParticipantsSectionProps } from '@extension/shared/lib/types/side-panel';
import { useTheme } from '@extension/ui/lib/components/ThemeProvider';

export const ParticipantsSection = ({ participants }: ParticipantsSectionProps) => {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const getOrganizationParticipants = () => {
        // Doesn't work for now, can't make a distinction
        const outsideOrg = participants.filter(p => !p.parentDeviceId && false);
        const withinOrg = participants.filter(p => p.parentDeviceId && false);
        return { outsideOrg, withinOrg };
    };

    return (
        <div
            className={`participants px-4 py-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}
            role="tabpanel"
            id="participants-panel">
            {(() => {
                const { outsideOrg, withinOrg } = getOrganizationParticipants();
                return (
                    <>
                        <div className="mb-8">
                            {participants
                                .filter(p => p.humanized_status === 'in_meeting')
                                .map(participant => (
                                    <div
                                        key={participant.deviceId}
                                        className={`participant flex items-center gap-4 mb-4 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800`}>
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm overflow-hidden bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300`}>
                                            {participant.profilePicture ? (
                                                <img
                                                    src={participant.profilePicture}
                                                    alt={participant.displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                participant.displayName
                                                    .split(' ')
                                                    .map(n => n[0])
                                                    .join('')
                                                    .toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-base font-medium text-gray-900 dark:text-white`}>
                                                {participant.fullName}
                                            </p>
                                            <p className={`text-sm text-gray-600 dark:text-gray-400`}>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                    In meeting
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        {outsideOrg.length > 0 && (
                            <div className="mb-8">
                                <h3 className={`text-sm font-medium mb-4 text-gray-500 dark:text-gray-400`}>
                                    Outside your Organization ({outsideOrg.length})
                                </h3>
                                {outsideOrg.map(participant => (
                                    <div
                                        key={participant.deviceId}
                                        className={`participant flex items-center gap-4 mb-4 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800`}>
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm overflow-hidden bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300`}>
                                            {participant.profilePicture ? (
                                                <img
                                                    src={participant.profilePicture}
                                                    alt={participant.displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                participant.displayName
                                                    .split(' ')
                                                    .map(n => n[0])
                                                    .join('')
                                                    .toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-base font-medium text-gray-900 dark:text-white`}>
                                                {participant.fullName}
                                            </p>
                                            <p className={`text-sm text-gray-600 dark:text-gray-400`}>
                                                {(() => {
                                                    switch (participant.humanized_status) {
                                                        case 'in_meeting':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                                    In meeting
                                                                </span>
                                                            );
                                                        case 'not_in_meeting':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                                    Not in meeting
                                                                </span>
                                                            );
                                                        case 'removed_from_meeting':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                                    Left meeting
                                                                </span>
                                                            );
                                                        case 'requested_to_join':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                                                    Requested to join
                                                                </span>
                                                            );
                                                        default:
                                                            return participant.humanized_status;
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {withinOrg.length > 0 && (
                            <div>
                                <h3 className={`text-sm font-medium mb-4 text-gray-500 dark:text-gray-400`}>
                                    Within your Organization ({withinOrg.length})
                                </h3>
                                {withinOrg.map(participant => (
                                    <div
                                        key={participant.deviceId}
                                        className={`participant flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800`}>
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm overflow-hidden bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300`}>
                                            {participant.profilePicture ? (
                                                <img
                                                    src={participant.profilePicture}
                                                    alt={participant.displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                participant.displayName
                                                    .split(' ')
                                                    .map(n => n[0])
                                                    .join('')
                                                    .toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p
                                                className={`text-base font-medium ${
                                                    isLight ? 'text-gray-900' : 'text-white'
                                                }`}>
                                                {participant.fullName}
                                            </p>
                                            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {(() => {
                                                    switch (participant.humanized_status) {
                                                        case 'in_meeting':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                                    In meeting
                                                                </span>
                                                            );
                                                        case 'not_in_meeting':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                                    Not in meeting
                                                                </span>
                                                            );
                                                        case 'removed_from_meeting':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                                    Left meeting
                                                                </span>
                                                            );
                                                        case 'requested_to_join':
                                                            return (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                                                    Requested to join
                                                                </span>
                                                            );
                                                        default:
                                                            return participant.humanized_status;
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
};
