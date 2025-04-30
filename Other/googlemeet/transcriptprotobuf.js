/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
'use strict';

var $protobuf = require('protobufjs/minimal');

// Common aliases
var $Reader = $protobuf.Reader,
    $Writer = $protobuf.Writer,
    $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots['default'] || ($protobuf.roots['default'] = {});

$root.TranscriptMessage = (function () {
    /**
     * Properties of a TranscriptMessage.
     * @exports ITranscriptMessage
     * @interface ITranscriptMessage
     * @property {string|null} [deviceId] TranscriptMessage deviceId
     * @property {number|null} [messageId] TranscriptMessage messageId
     * @property {number|null} [messageVersion] TranscriptMessage messageVersion
     * @property {string|null} [text] TranscriptMessage text
     * @property {number|null} [langId] TranscriptMessage langId
     */

    /**
     * Constructs a new TranscriptMessage.
     * @exports TranscriptMessage
     * @classdesc Represents a TranscriptMessage.
     * @implements ITranscriptMessage
     * @constructor
     * @param {ITranscriptMessage=} [properties] Properties to set
     */
    function TranscriptMessage(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * TranscriptMessage deviceId.
     * @member {string} deviceId
     * @memberof TranscriptMessage
     * @instance
     */
    TranscriptMessage.prototype.deviceId = '';

    /**
     * TranscriptMessage messageId.
     * @member {number} messageId
     * @memberof TranscriptMessage
     * @instance
     */
    TranscriptMessage.prototype.messageId = 0;

    /**
     * TranscriptMessage messageVersion.
     * @member {number} messageVersion
     * @memberof TranscriptMessage
     * @instance
     */
    TranscriptMessage.prototype.messageVersion = 0;

    /**
     * TranscriptMessage text.
     * @member {string} text
     * @memberof TranscriptMessage
     * @instance
     */
    TranscriptMessage.prototype.text = '';

    /**
     * TranscriptMessage langId.
     * @member {number} langId
     * @memberof TranscriptMessage
     * @instance
     */
    TranscriptMessage.prototype.langId = 0;

    /**
     * Creates a new TranscriptMessage instance using the specified properties.
     * @function create
     * @memberof TranscriptMessage
     * @static
     * @param {ITranscriptMessage=} [properties] Properties to set
     * @returns {TranscriptMessage} TranscriptMessage instance
     */
    TranscriptMessage.create = function create(properties) {
        return new TranscriptMessage(properties);
    };

    /**
     * Encodes the specified TranscriptMessage message. Does not implicitly {@link TranscriptMessage.verify|verify} messages.
     * @function encode
     * @memberof TranscriptMessage
     * @static
     * @param {ITranscriptMessage} message TranscriptMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TranscriptMessage.encode = function encode(message, writer) {
        if (!writer) writer = $Writer.create();
        if (message.deviceId != null && Object.hasOwnProperty.call(message, 'deviceId'))
            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.deviceId);
        if (message.messageId != null && Object.hasOwnProperty.call(message, 'messageId'))
            writer.uint32(/* id 2, wireType 0 =*/ 16).int64(message.messageId);
        if (message.messageVersion != null && Object.hasOwnProperty.call(message, 'messageVersion'))
            writer.uint32(/* id 3, wireType 0 =*/ 24).int64(message.messageVersion);
        if (message.text != null && Object.hasOwnProperty.call(message, 'text'))
            writer.uint32(/* id 6, wireType 2 =*/ 50).string(message.text);
        if (message.langId != null && Object.hasOwnProperty.call(message, 'langId'))
            writer.uint32(/* id 8, wireType 0 =*/ 64).int64(message.langId);
        return writer;
    };

    /**
     * Encodes the specified TranscriptMessage message, length delimited. Does not implicitly {@link TranscriptMessage.verify|verify} messages.
     * @function encodeDelimited
     * @memberof TranscriptMessage
     * @static
     * @param {ITranscriptMessage} message TranscriptMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TranscriptMessage.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a TranscriptMessage message from the specified reader or buffer.
     * @function decode
     * @memberof TranscriptMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {TranscriptMessage} TranscriptMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TranscriptMessage.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.TranscriptMessage();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1: {
                    message.deviceId = reader.string();
                    break;
                }
                case 2: {
                    message.messageId = reader.int64();
                    break;
                }
                case 3: {
                    message.messageVersion = reader.int64();
                    break;
                }
                case 6: {
                    message.text = reader.string();
                    break;
                }
                case 8: {
                    message.langId = reader.int64();
                    break;
                }
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    };

    /**
     * Decodes a TranscriptMessage message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof TranscriptMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {TranscriptMessage} TranscriptMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TranscriptMessage.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader)) reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a TranscriptMessage message.
     * @function verify
     * @memberof TranscriptMessage
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    TranscriptMessage.verify = function verify(message) {
        if (typeof message !== 'object' || message === null) return 'object expected';
        if (message.deviceId != null && message.hasOwnProperty('deviceId'))
            if (!$util.isString(message.deviceId)) return 'deviceId: string expected';
        if (message.messageId != null && message.hasOwnProperty('messageId'))
            if (!$util.isInteger(message.messageId)) return 'messageId: integer expected';
        if (message.messageVersion != null && message.hasOwnProperty('messageVersion'))
            if (!$util.isInteger(message.messageVersion)) return 'messageVersion: integer expected';
        if (message.text != null && message.hasOwnProperty('text'))
            if (!$util.isString(message.text)) return 'text: string expected';
        if (message.langId != null && message.hasOwnProperty('langId'))
            if (!$util.isInteger(message.langId)) return 'langId: integer expected';
        return null;
    };

    /**
     * Creates a TranscriptMessage message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof TranscriptMessage
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {TranscriptMessage} TranscriptMessage
     */
    TranscriptMessage.fromObject = function fromObject(object) {
        if (object instanceof $root.TranscriptMessage) return object;
        var message = new $root.TranscriptMessage();
        if (object.deviceId != null) message.deviceId = String(object.deviceId);
        if (object.messageId != null) message.messageId = object.messageId | 0;
        if (object.messageVersion != null) message.messageVersion = object.messageVersion | 0;
        if (object.text != null) message.text = String(object.text);
        if (object.langId != null) message.langId = object.langId | 0;
        return message;
    };

    /**
     * Creates a plain object from a TranscriptMessage message. Also converts values to other types if specified.
     * @function toObject
     * @memberof TranscriptMessage
     * @static
     * @param {TranscriptMessage} message TranscriptMessage
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    TranscriptMessage.toObject = function toObject(message, options) {
        if (!options) options = {};
        var object = {};
        if (options.defaults) {
            object.deviceId = '';
            object.messageId = 0;
            object.messageVersion = 0;
            object.text = '';
            object.langId = 0;
        }
        if (message.deviceId != null && message.hasOwnProperty('deviceId')) object.deviceId = message.deviceId;
        if (message.messageId != null && message.hasOwnProperty('messageId')) object.messageId = message.messageId;
        if (message.messageVersion != null && message.hasOwnProperty('messageVersion'))
            object.messageVersion = message.messageVersion;
        if (message.text != null && message.hasOwnProperty('text')) object.text = message.text;
        if (message.langId != null && message.hasOwnProperty('langId')) object.langId = message.langId;
        return object;
    };

    /**
     * Converts this TranscriptMessage to JSON.
     * @function toJSON
     * @memberof TranscriptMessage
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    TranscriptMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for TranscriptMessage
     * @function getTypeUrl
     * @memberof TranscriptMessage
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    TranscriptMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = 'type.googleapis.com';
        }
        return typeUrlPrefix + '/TranscriptMessage';
    };

    return TranscriptMessage;
})();

$root.TranscriptMessageWrapper = (function () {
    /**
     * Properties of a TranscriptMessageWrapper.
     * @exports ITranscriptMessageWrapper
     * @interface ITranscriptMessageWrapper
     * @property {ITranscriptMessage|null} [message] TranscriptMessageWrapper message
     */

    /**
     * Constructs a new TranscriptMessageWrapper.
     * @exports TranscriptMessageWrapper
     * @classdesc Represents a TranscriptMessageWrapper.
     * @implements ITranscriptMessageWrapper
     * @constructor
     * @param {ITranscriptMessageWrapper=} [properties] Properties to set
     */
    function TranscriptMessageWrapper(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * TranscriptMessageWrapper message.
     * @member {ITranscriptMessage|null|undefined} message
     * @memberof TranscriptMessageWrapper
     * @instance
     */
    TranscriptMessageWrapper.prototype.message = null;

    /**
     * Creates a new TranscriptMessageWrapper instance using the specified properties.
     * @function create
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {ITranscriptMessageWrapper=} [properties] Properties to set
     * @returns {TranscriptMessageWrapper} TranscriptMessageWrapper instance
     */
    TranscriptMessageWrapper.create = function create(properties) {
        return new TranscriptMessageWrapper(properties);
    };

    /**
     * Encodes the specified TranscriptMessageWrapper message. Does not implicitly {@link TranscriptMessageWrapper.verify|verify} messages.
     * @function encode
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {ITranscriptMessageWrapper} message TranscriptMessageWrapper message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TranscriptMessageWrapper.encode = function encode(message, writer) {
        if (!writer) writer = $Writer.create();
        if (message.message != null && Object.hasOwnProperty.call(message, 'message'))
            $root.TranscriptMessage.encode(message.message, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified TranscriptMessageWrapper message, length delimited. Does not implicitly {@link TranscriptMessageWrapper.verify|verify} messages.
     * @function encodeDelimited
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {ITranscriptMessageWrapper} message TranscriptMessageWrapper message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TranscriptMessageWrapper.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a TranscriptMessageWrapper message from the specified reader or buffer.
     * @function decode
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {TranscriptMessageWrapper} TranscriptMessageWrapper
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TranscriptMessageWrapper.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length,
            message = new $root.TranscriptMessageWrapper();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1: {
                    message.message = $root.TranscriptMessage.decode(reader, reader.uint32());
                    break;
                }
                case 2:
                    message.unknown2 = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    };

    /**
     * Decodes a TranscriptMessageWrapper message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {TranscriptMessageWrapper} TranscriptMessageWrapper
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TranscriptMessageWrapper.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader)) reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a TranscriptMessageWrapper message.
     * @function verify
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    TranscriptMessageWrapper.verify = function verify(message) {
        if (typeof message !== 'object' || message === null) return 'object expected';
        if (message.message != null && message.hasOwnProperty('message')) {
            var error = $root.TranscriptMessage.verify(message.message);
            if (error) return 'message.' + error;
        }
        return null;
    };

    /**
     * Creates a TranscriptMessageWrapper message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {TranscriptMessageWrapper} TranscriptMessageWrapper
     */
    TranscriptMessageWrapper.fromObject = function fromObject(object) {
        if (object instanceof $root.TranscriptMessageWrapper) return object;
        var message = new $root.TranscriptMessageWrapper();
        if (object.message != null) {
            if (typeof object.message !== 'object')
                throw TypeError('.TranscriptMessageWrapper.message: object expected');
            message.message = $root.TranscriptMessage.fromObject(object.message);
        }
        return message;
    };

    /**
     * Creates a plain object from a TranscriptMessageWrapper message. Also converts values to other types if specified.
     * @function toObject
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {TranscriptMessageWrapper} message TranscriptMessageWrapper
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    TranscriptMessageWrapper.toObject = function toObject(message, options) {
        if (!options) options = {};
        var object = {};
        if (options.defaults) object.message = null;
        if (message.message != null && message.hasOwnProperty('message'))
            object.message = $root.TranscriptMessage.toObject(message.message, options);
        return object;
    };

    /**
     * Converts this TranscriptMessageWrapper to JSON.
     * @function toJSON
     * @memberof TranscriptMessageWrapper
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    TranscriptMessageWrapper.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for TranscriptMessageWrapper
     * @function getTypeUrl
     * @memberof TranscriptMessageWrapper
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    TranscriptMessageWrapper.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = 'type.googleapis.com';
        }
        return typeUrlPrefix + '/TranscriptMessageWrapper';
    };

    return TranscriptMessageWrapper;
})();

module.exports = $root;
