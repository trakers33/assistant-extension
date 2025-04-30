import { useEffect, useState, useRef } from 'react';
import { storage } from 'webextension-polyfill';
import { getCurrentTab } from '../../helpers/tabs';

export const Transcript = () => {
    const [messages, setMessages] = useState<Array<{ deviceName: string; text: string; id: string }>>([]);

    useEffect(() => {
        const readBackgroundMessage = async () => {
            const tab = await getCurrentTab();
            const tabId = tab.id;

            if (tabId) {
                // read all message id's
                const captions = await storage.local.get([tab.url + '_caption_ids']);

                // find message text using the message id's found above
                const messageArr: Array<{ deviceName: string; text: string; id: string }> = [];
                if (captions && captions[tab.url + '_caption_ids']) {
                    for (const captionId of captions[tab.url + '_caption_ids']) {
                        let caption = await storage.local.get([captionId]);
                        let deviceName = await storage.local.get([tab.url + '_' + caption[captionId].deviceId]);
                        messageArr.push({
                            deviceName: deviceName[tab.url + '_' + caption[captionId].deviceId],
                            text: caption[captionId].text,
                            id: caption[captionId].messageId,
                        });
                    }
                }
                setMessages([...messageArr]);
            }
        };

        const interval = setInterval(() => {
            readBackgroundMessage();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // scroll to bottom as new messages are added to the transcript
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div
            style={{
                height: '100vh',
                marginTop: 20,
                marginBottom: 20,
                marginRight: 10,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'start',
                justifyContent: 'start',
            }}>
            <ul style={{ listStyleType: 'none' }}>
                {messages.map((message, i) => {
                    return i == 0 || (i > 0 && messages[i - 1].deviceName !== message.deviceName) ? (
                        <>
                            <li key={message.deviceName + new Date()}>
                                <div style={{ color: 'blue', fontWeight: 'bold' }}>{message.deviceName} :</div>
                                <span key={message.deviceName + message.id}>{' ' + message.text}</span>
                            </li>
                        </>
                    ) : (
                        <>
                            <span key={message.deviceName + message.id}>{' ' + message.text}</span>
                            {message.text && message.text.endsWith('.') ? <div></div> : ''}
                        </>
                    );
                })}
                <div ref={messagesEndRef} />
            </ul>
        </div>
    );
};
