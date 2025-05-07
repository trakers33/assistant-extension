import { Participant } from './meeting.js';

export enum MessageDestination {
    sidePanel = 'sidePanel',
    inline = 'inline',
    background = 'background',
    option = 'option',
    script = 'script',
}

export enum MessageSource {
    sidePanel = 'sidePanel',
    inline = 'inline',
    background = 'background',
    option = 'option',
    script = 'script',
}

export enum MessageType {
    CAPTIONS_UPDATE = 'CAPTIONS_UPDATE',
    USERS_UPDATE = 'USERS_UPDATE',
    REQUEST_MEETING_INFO = 'REQUEST_MEETING_INFO',
    TOGGLE = 'TOGGLE',
    INSIGHTS_UPDATE = 'INSIGHTS_UPDATE',
    MEETING_INFO = 'MEETING_INFO',
    ENABLE_CAPTIONS = 'ENABLE_CAPTIONS',
    VIDEO_TOGGLE = 'VIDEO_TOGGLE',
    SAVE_TRANSCRIPT = 'SAVE_TRANSCRIPT',
    SCRIPT_REQUEST = 'SCRIPT_REQUEST',
    START_CAPTURING = 'START_CAPTURING',
    MEETING_READY = 'MEETING_READY',
    DEVICE_OUTPUTS_UPDATE = 'DEVICE_OUTPUTS_UPDATE',
    REQUEST_GENERATE_SUMMARY = 'REQUEST_GENERATE_SUMMARY',
}

export interface RuntimeMessage {
    type: MessageType;
    to: MessageDestination;
    meetingId?: string;
    data: ParticipantMessage | MeetingInfoMessage | any;
    from?: MessageSource;
}

export interface ParticipantMessage {
    participants: Participant[];
}

export interface MeetingInfoMessage {
    title: string;
    url: string;
}
