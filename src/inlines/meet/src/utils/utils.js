import { $Reader } from '../lib/transcriptprotobuf.js';

function base64ToUint8Array(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

function readVarint(buffer, startIndex) {
    let result = 0;
    let shift = 0;
    let index = startIndex;

    while (true) {
        const byte = buffer[index++];
        result |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
    }

    return { value: result, nextIndex: index };
}

function getWireTypeInfo(tagByte) {
    return {
        fieldNumber: tagByte >>> 3,
        wireType: tagByte & 0b111,
    };
}

function parseProtobuf(buffer, start = 0, end = buffer.length) {
    const result = {};
    let index = start;

    while (index < end) {
        const tag = buffer[index++];
        const { fieldNumber, wireType } = getWireTypeInfo(tag);

        if (wireType === 0) {
            // Varint
            const { value, nextIndex } = readVarint(buffer, index);
            result[`field_${fieldNumber}`] = value;
            index = nextIndex;
        } else if (wireType === 2) {
            // Length-delimited (e.g. string or nested message)
            const { value: length, nextIndex } = readVarint(buffer, index);
            index = nextIndex;
            const subBuffer = buffer.slice(index, index + length);

            // Try to decode as UTF-8 string, fallback to nested message
            const asString = new TextDecoder().decode(subBuffer);
            if (/^[\x20-\x7E]*$/.test(asString)) {
                if (Array.isArray(result[`field_${fieldNumber}`])) {
                    result[`field_${fieldNumber}`].push(asString);
                } else if (result[`field_${fieldNumber}`] !== undefined) {
                    result[`field_${fieldNumber}`] = [result[`field_${fieldNumber}`], asString];
                } else {
                    result[`field_${fieldNumber}`] = asString;
                }
            } else {
                const parsed = parseProtobuf(subBuffer);
                if (Array.isArray(result[`field_${fieldNumber}`])) {
                    result[`field_${fieldNumber}`].push(parsed);
                } else if (result[`field_${fieldNumber}`] !== undefined) {
                    result[`field_${fieldNumber}`] = [result[`field_${fieldNumber}`], parsed];
                } else {
                    result[`field_${fieldNumber}`] = parsed;
                }
            }

            index += length;
        } else if (wireType === 5) {
            // 32-bit fixed (e.g. fixed32, float)
            if (index + 4 > buffer.length) {
                console.warn('Incomplete 32-bit fixed value at end of buffer, skipping.');
                break;
            }

            const value =
                (buffer[index] | (buffer[index + 1] << 8) | (buffer[index + 2] << 16) | (buffer[index + 3] << 24)) >>>
                0; // Force unsigned 32-bit int

            result[`field_${fieldNumber}`] = value;
            index += 4;
        } else if (wireType === 1) {
            // 64-bit fixed (e.g. fixed64, double)
            if (index + 8 > buffer.length) {
                //console.warn("Incomplete 64-bit fixed value at end of buffer, skipping.");
                break;
            }

            const value =
                buffer[index] |
                (buffer[index + 1] << 8) |
                (buffer[index + 2] << 16) |
                (buffer[index + 3] << 24) |
                (buffer[index + 4] << 32) |
                (buffer[index + 5] << 40) |
                (buffer[index + 6] << 48) |
                (buffer[index + 7] << 56);

            result[`field_${fieldNumber}`] = value;
            index += 8;
        } else if (wireType === 3 || wireType === 4) {
            // Start group (3) and end group (4) - these are deprecated in proto3
            // We'll just skip them as they're not commonly used
            while (index < end) {
                if (index >= buffer.length) {
                    //console.warn("Unexpected end of buffer while parsing group, skipping.");
                    break;
                }

                const groupTag = buffer[index++];
                const { fieldNumber: groupFieldNumber, wireType: groupWireType } = getWireTypeInfo(groupTag);

                if (groupWireType === 4 && groupFieldNumber === fieldNumber) {
                    break; // Found matching end group
                }

                // Skip the field value
                if (groupWireType === 0) {
                    if (index >= buffer.length) {
                        //console.warn("Unexpected end of buffer while reading varint in group, skipping.");
                        break;
                    }
                    const { nextIndex } = readVarint(buffer, index);
                    index = nextIndex;
                } else if (groupWireType === 1) {
                    if (index + 8 > buffer.length) {
                        //console.warn("Incomplete 64-bit fixed value in group at end of buffer, skipping.");
                        break;
                    }
                    index += 8;
                } else if (groupWireType === 2) {
                    if (index >= buffer.length) {
                        //console.warn("Unexpected end of buffer while reading length in group, skipping.");
                        break;
                    }
                    const { value: length, nextIndex } = readVarint(buffer, index);
                    index = nextIndex;
                    if (index + length > buffer.length) {
                        //console.warn("Incomplete length-delimited value in group at end of buffer, skipping.");
                        break;
                    }
                    index += length;
                } else if (groupWireType === 5) {
                    if (index + 4 > buffer.length) {
                        //console.warn("Incomplete 32-bit fixed value in group at end of buffer, skipping.");
                        break;
                    }
                    index += 4;
                }
            }
        } else {
            //console.warn(`Unsupported wire type: ${wireType}, skipping.`);
            break;
        }
    }

    return result;
}

function createMessageDecoder(messageType) {
    return function decode(reader, length) {
        if (!(reader instanceof $Reader)) {
            reader = $Reader.create(reader);
        }

        const end = length === undefined ? reader.len : reader.pos + length;
        const message = {};

        // Run this to parse the entire message !!!!!
        //const parsed = parseProtobuf(reader.buf, reader.pos, end);
        //console.log('parsed', parsed);
        while (reader.pos < end) {
            const tag = reader.uint32();
            const fieldNumber = tag >>> 3;

            const field = messageType.fields.find(f => f.fieldNumber === fieldNumber);
            if (!field) {
                // Skip the field after trying all methods
                reader.skipType(tag & 7);
                continue;
            }

            let value;
            switch (field.type) {
                case 'string':
                    value = reader.string();
                    break;
                case 'int64':
                    value = reader.int64();
                    break;
                case 'varint':
                    value = reader.uint32();
                    break;
                case 'message':
                    value = messageDecoders[field.messageType](reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    continue;
            }

            if (field.repeated) {
                if (!message[field.name]) {
                    message[field.name] = [];
                }
                message[field.name].push(value);
            } else {
                message[field.name] = value;
            }
        }

        return message;
    };
}

const messageTypes = [
    {
        name: 'CollectionEvent',
        fields: [{ name: 'body', fieldNumber: 1, type: 'message', messageType: 'CollectionEventBody' }],
    },
    {
        name: 'CollectionEventBody',
        fields: [
            {
                name: 'userInfoListWrapperAndChatWrapperWrapper',
                fieldNumber: 2,
                type: 'message',
                messageType: 'UserInfoListWrapperAndChatWrapperWrapper',
            },
        ],
    },
    {
        name: 'UserInfoListWrapperAndChatWrapperWrapper',
        fields: [
            { name: 'deviceInfoWrapper', fieldNumber: 3, type: 'message', messageType: 'DeviceInfoWrapper' },
            {
                name: 'userInfoListWrapperAndChatWrapper',
                fieldNumber: 13,
                type: 'message',
                messageType: 'UserInfoListWrapperAndChatWrapper',
            },
        ],
    },
    {
        name: 'UserInfoListWrapperAndChatWrapper',
        fields: [
            { name: 'userInfoListWrapper', fieldNumber: 1, type: 'message', messageType: 'UserInfoListWrapper' },
            {
                name: 'chatMessageWrapper',
                fieldNumber: 4,
                type: 'message',
                messageType: 'ChatMessageWrapper',
                repeated: true,
            },
        ],
    },
    {
        name: 'DeviceInfoWrapper',
        fields: [
            {
                name: 'deviceOutputInfoList',
                fieldNumber: 2,
                type: 'message',
                messageType: 'DeviceOutputInfoList',
                repeated: true,
            },
        ],
    },
    {
        name: 'DeviceOutputInfoList',
        fields: [
            { name: 'deviceOutputType', fieldNumber: 2, type: 'varint' }, // Speculating that 1 = audio, 2 = video
            { name: 'streamId', fieldNumber: 4, type: 'string' },
            { name: 'deviceId', fieldNumber: 6, type: 'string' },
            { name: 'deviceOutputStatus', fieldNumber: 10, type: 'message', messageType: 'DeviceOutputStatus' },
        ],
    },
    {
        name: 'DeviceOutputStatus',
        fields: [{ name: 'disabled', fieldNumber: 1, type: 'varint' }],
    },
    // Existing message types
    {
        name: 'UserInfoListResponse',
        fields: [
            {
                name: 'userInfoHeader',
                fieldNumber: 1,
                type: 'message',
                messageType: 'UserInfoHeader',
            },
            {
                name: 'userInfoListWrapperWrapper',
                fieldNumber: 2,
                type: 'message',
                messageType: 'UserInfoListWrapperWrapper',
            },
        ],
    },
    {
        name: 'UserInfoListResponse',
        fields: [
            {
                name: 'userInfoHeader',
                fieldNumber: 1,
                type: 'message',
                messageType: 'UserInfoHeader',
            },
            {
                name: 'userInfoListWrapperWrapper',
                fieldNumber: 2,
                type: 'message',
                messageType: 'UserInfoListWrapperWrapper',
            },
        ],
    },
    {
        name: 'UserInfoHeader',
        fields: [
            {
                name: 'UserInforHeaderWrapper1',
                fieldNumber: 2,
                type: 'message',
                messageType: 'UserInforHeaderWrapper1',
            },
        ],
    },
    {
        name: 'UserInforHeaderWrapper1',
        fields: [
            { name: 'userInfoListWrapper2', fieldNumber: 2, type: 'message', messageType: 'UserInfoListWrapper2' },
        ],
    },
    {
        name: 'UserInfoListWrapper2',
        fields: [
            { name: 'userInfoListWrapper3', fieldNumber: 6, type: 'message', messageType: 'UserInfoListWrapper3' },
        ],
    },
    {
        name: 'UserInfoListWrapper3',
        fields: [{ name: 'companyName', fieldNumber: 4, type: 'string' }],
    },
    /* {
        name: 'UserInfoListResponse',
        fields: [
            {
                name: 'userInfoListWrapperWrapper',
                fieldNumber: 2,
                type: 'message',
                messageType: 'UserInfoListWrapperWrapper',
            },
        ],
    }, */
    {
        name: 'UserInfoListWrapperWrapper',
        fields: [{ name: 'userInfoListWrapper', fieldNumber: 2, type: 'message', messageType: 'UserInfoListWrapper' }],
    },
    {
        name: 'UserEventInfo',
        fields: [
            { name: 'eventNumber', fieldNumber: 1, type: 'varint' }, // sequence number for the event
        ],
    },
    {
        name: 'UserInfoListWrapper',
        fields: [
            { name: 'userEventInfo', fieldNumber: 1, type: 'message', messageType: 'UserEventInfo' },
            { name: 'userInfoList', fieldNumber: 2, type: 'message', messageType: 'UserInfoList', repeated: true },
        ],
    },
    {
        name: 'UserInfoList',
        fields: [
            { name: 'deviceId', fieldNumber: 1, type: 'string' },
            { name: 'fullName', fieldNumber: 2, type: 'string' },
            { name: 'profilePicture', fieldNumber: 3, type: 'string' },
            { name: 'status', fieldNumber: 4, type: 'varint' }, // in meeting = 1 vs not in meeting = 6. Landing Room = 2 & kicked out = 7?
            { name: 'userId', fieldNumber: 7, type: 'string' },
            { name: 'displayName', fieldNumber: 29, type: 'string' },
            { name: 'parentDeviceId', fieldNumber: 21, type: 'string' }, // if this is present, then this is a screenshare device. The parentDevice is the person that is sharing
        ],
    },
    {
        name: 'CaptionWrapper',
        fields: [{ name: 'caption', fieldNumber: 1, type: 'message', messageType: 'Caption' }],
    },
    {
        name: 'Caption',
        fields: [
            { name: 'deviceId', fieldNumber: 1, type: 'string' },
            { name: 'captionId', fieldNumber: 2, type: 'int64' },
            { name: 'version', fieldNumber: 3, type: 'int64' },
            { name: 'text', fieldNumber: 6, type: 'string' },
            { name: 'languageId', fieldNumber: 8, type: 'int64' },
            { name: 'captionHeader', fieldNumber: 12, type: 'message', messageType: 'CaptionHeader' },
        ],
    },
    {
        name: 'CaptionHeader',
        fields: [{ name: 'timestamp', fieldNumber: 1, type: 'int64' }],
    },
    {
        name: 'ChatMessageWrapper',
        fields: [{ name: 'chatMessage', fieldNumber: 2, type: 'message', messageType: 'ChatMessage' }],
    },
    {
        name: 'ChatMessage',
        fields: [
            { name: 'messageId', fieldNumber: 1, type: 'string' },
            { name: 'deviceId', fieldNumber: 2, type: 'string' },
            { name: 'timestamp', fieldNumber: 3, type: 'int64' },
            { name: 'chatMessageContent', fieldNumber: 5, type: 'message', messageType: 'ChatMessageContent' },
        ],
    },
    {
        name: 'ChatMessageContent',
        fields: [{ name: 'text', fieldNumber: 1, type: 'string' }],
    },
];
// Create decoders for all message types
const messageDecoders = {};
messageTypes.forEach(type => {
    messageDecoders[type.name] = createMessageDecoder(type);
});

export { base64ToUint8Array, messageDecoders, parseProtobuf };
