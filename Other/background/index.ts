import { runtime, storage } from 'webextension-polyfill';

type CaptionMessage = { deviceId: string; langId: number; messageId: string; messageVersion: number; text: string };
type Device = { deviceId: string; deviceName: string };

type CaptionMessageWrapper = {
    from: string;
    to: string;
    detail: { messages: [CaptionMessage]; location: string; type: string };
};

type DeviceMessageWrapper = {
    from: string;
    to: string;
    type: string;
    detail: { devices: [Device]; location: string; type: string };
};

const keepAlive = () => setInterval(runtime.getPlatformInfo, 20e3);
runtime.onStartup.addListener(keepAlive);
keepAlive();

export async function init() {
    await storage.local.clear();
    runtime.onMessage.addListener(async (message: CaptionMessageWrapper) => {
        if (message.to === 'background' && message.detail.type === 'caption') {
            for (const msg of message.detail.messages) {
                // update with latest version of message for this messages id
                const messageInStorage = await storage.local.get([msg.messageId]);
                if (
                    messageInStorage !== undefined &&
                    messageInStorage.messageVersion !== undefined &&
                    messageInStorage.messageVersion <= msg.messageVersion
                ) {
                    await storage.local.set({ [msg.messageId]: msg });
                } else {
                    await storage.local.set({ [msg.messageId]: msg });
                }

                // add message id's into the index that will be used by transcript
                const key: string = message.detail.location + '_caption_ids';
                const captionsInStorage = await storage.local.get([key]);
                if (captionsInStorage !== undefined) {
                    const captionsArr = captionsInStorage[key] || [];
                    if (captionsArr.indexOf(msg.messageId) == -1) {
                        captionsArr.push(msg.messageId);
                    }
                    await storage.local.set({ [key]: captionsArr });
                }
            }
        }
    });

    runtime.onMessage.addListener(async (message: DeviceMessageWrapper) => {
        // if message is for deviceinfo then add device and display name map into a index
        if (
            message.to === 'background' &&
            (message.detail.type === 'premeeting-devices' || message.detail.type === 'deviceinfo')
        ) {
            for (const device of message.detail.devices) {
                const key = message.detail.location + '_';
                const deviceInStorage = await storage.local.get([key + device.deviceId]);
                if (deviceInStorage !== undefined) {
                    await storage.local.set({ [key + device.deviceId]: device.deviceName });
                } else {
                    await storage.local.set({ [key + device.deviceId]: device.deviceName });
                }
            }
        }
    });
}

runtime.onInstalled.addListener(() => {
    init().then(() => {
        console.log('[background] loaded ');
    });
});
