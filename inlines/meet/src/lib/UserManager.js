import { MessageDestination } from '@extension/shared/lib/types/runtime';

export default class UserManager {
    constructor() {
        this.allUsersMap = new Map();
        this.currentUsersMap = new Map();
        this.deviceOutputMap = new Map();
    }

    reset() {
        this.allUsersMap.clear();
        this.currentUsersMap.clear();
        this.deviceOutputMap.clear();
    }

    deviceForStreamIsActive(streamId) {
        for (const deviceOutput of this.deviceOutputMap.values()) {
            if (deviceOutput.streamId === streamId) {
                return !deviceOutput.disabled;
            }
        }

        return false;
    }

    getDeviceOutput(deviceId, outputType) {
        return this.deviceOutputMap.get(`${deviceId}-${outputType}`);
    }

    updateDeviceOutputs(deviceOutputs) {
        for (const output of deviceOutputs) {
            const key = `${output.deviceId}-${output.deviceOutputType}`; // Unique key combining device ID and output type

            const deviceOutput = {
                deviceId: output.deviceId,
                outputType: output.deviceOutputType, // 1 = audio, 2 = video
                streamId: output.streamId,
                disabled: output.deviceOutputStatus.disabled,
                lastUpdated: Date.now(),
            };

            this.deviceOutputMap.set(key, deviceOutput);
        }

        // Notify background script about the device output update
        /* chrome.runtime.sendMessage(
            chrome.runtime.id,
            {
                type: 'DeviceOutputsUpdate',
                data: {
                    deviceOutputs: Array.from(this.deviceOutputMap.values())
                }
            }
        ); */
        document.documentElement.dispatchEvent(
            new CustomEvent('assistant-message', {
                detail: {
                    type: MessageType.DEVICE_OUTPUTS_UPDATE,
                    data: {
                        deviceOutputs: Array.from(this.deviceOutputMap.values()),
                    },
                    from: MessageDestination.inline,
                    to: MessageDestination.sidePanel,
                },
            }),
        );
    }

    getUserByStreamId(streamId) {
        // Look through device output map and find the corresponding device id. Then look up the user by device id.
        for (const deviceOutput of this.deviceOutputMap.values()) {
            if (deviceOutput.streamId === streamId) {
                return this.allUsersMap.get(deviceOutput.deviceId);
            }
        }

        return null;
    }

    getUserByDeviceId(deviceId) {
        return this.allUsersMap.get(deviceId);
    }

    // constants for meeting status
    USER_STATUS_MAP = {
        1: 'in_meeting',
        3: 'requested_to_join',
        6: 'not_in_meeting',
        7: 'removed_from_meeting',
    };
    getCurrentUsersInMeeting() {
        return Array.from(this.currentUsersMap.values()).filter(
            user => this.USER_STATUS_MAP[user.status] === 'in_meeting',
        );
    }

    getCurrentUsersInMeetingWhoAreScreenSharing() {
        return this.getCurrentUsersInMeeting().filter(user => user.parentDeviceId);
    }

    singleUserSynced(user) {
        // Create array with new user and existing users, then filter for unique deviceIds
        // keeping the first occurrence (new user takes precedence)
        const allUsers = [...this.currentUsersMap.values(), user];
        const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.deviceId, user])).values());
        this.newUsersListSynced(uniqueUsers);
    }

    newUsersListSynced(newUsersListRaw) {
        const newUsersList = newUsersListRaw.map(user => {
            return {
                ...user,
                humanized_status: user.status <= 3 ? this.USER_STATUS_MAP[1] : this.USER_STATUS_MAP[6],
            };
        });
        // Get the current user IDs before updating
        const previousUserIds = new Set(this.currentUsersMap.keys());
        const newUserIds = new Set(newUsersList.map(user => user.deviceId));
        const updatedUserIds = new Set([]);

        // Update all users map
        for (const user of newUsersList) {
            if (
                previousUserIds.has(user.deviceId) &&
                JSON.stringify(this.currentUsersMap.get(user.deviceId)) !== JSON.stringify(user)
            ) {
                updatedUserIds.add(user.deviceId);
            }

            this.allUsersMap.set(user.deviceId, {
                deviceId: user.deviceId,
                displayName: user.displayName,
                fullName: user.fullName,
                profilePicture: user.profilePicture,
                status: user.status,
                humanized_status: user.humanized_status,
                parentDeviceId: user.parentDeviceId,
            });
        }

        // Calculate new, removed, and updated users
        const newUsers = newUsersList.filter(user => !previousUserIds.has(user.deviceId));
        const removedUsers = Array.from(previousUserIds)
            .filter(id => !newUserIds.has(id))
            .map(id => this.currentUsersMap.get(id));

        // Clear current users map and update with new list
        this.currentUsersMap.clear();
        for (const user of newUsersList) {
            this.currentUsersMap.set(user.deviceId, {
                deviceId: user.deviceId,
                displayName: user.displayName,
                fullName: user.fullName,
                profilePicture: user.profilePicture,
                status: user.status,
                humanized_status: user.humanized_status,
                parentDeviceId: user.parentDeviceId,
            });
        }

        const updatedUsers = Array.from(updatedUserIds).map(id => this.currentUsersMap.get(id));

        if (newUsers.length > 0 || removedUsers.length > 0 || updatedUsers.length > 0) {
            document.documentElement.dispatchEvent(
                new CustomEvent('assistant-message', {
                    detail: {
                        type: 'USERS_UPDATE',
                        data: {
                            newUsers: newUsers,
                            removedUsers: removedUsers,
                            updatedUsers: updatedUsers,
                        },
                        from: MessageDestination.inline,
                        to: MessageDestination.sidePanel,
                    },
                }),
            );
        }
    }
}
