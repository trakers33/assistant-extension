export interface CaptionData {
    text: string;
    timestamp: number;
    speakerName?: string;
    captionId: number;
    version: number;
    deviceId: string;
    languageId: number;
    speaker?: Participant;
    captionHeader: {
        timestamp: number;
    };
}

export interface Participant {
    deviceId: string;
    displayName: string;
    fullName: string;
    profilePicture?: string;
    status: number;
    humanized_status: string;
    parentDeviceId?: string;
}

export interface DeviceOutput {
    deviceId: string;
    streamId: string;
    streamType: string;
    streamUrl: string;
}
