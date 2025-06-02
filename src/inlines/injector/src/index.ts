import { getAutoCaptions, optionsStorage } from '@extension/storage';
import { MessageDestination, MessageType, MessageSource } from '@extension/shared/lib/types/runtime';

declare global {
    interface Window {
        transcriptgen: {
            rtc?: {
                videoEnabled?: boolean;
            };
        };
    }
}

interface MeetMessage {
    type: string;
    data: any;
    meetingId?: string;
    to?: string;
    from?: string;
}

const meetHost = 'meet.google.com';

// Initialize the side panel
let sidePanelContainer: HTMLDivElement | null = null;
let meetingId: string | null = null;

// Add meeting ready state
let isMeetingReady = false;

// Function to update meeting ready state and toggle button visibility
const updateMeetingReadyState = (ready: boolean) => {
    isMeetingReady = ready;
    const toggleButton = document.getElementById('meet-sales-assistant-side-toggle');
    if (toggleButton) {
        toggleButton.style.display = ready ? 'flex' : 'none';
        toggleButton.style.alignItems = 'center';
        toggleButton.style.justifyContent = 'center';
    }
};

// Extract meeting ID from URL
const extractMeetingId = (url: string): string | null => {
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    return match ? match[1] : null;
};

const isMeetPage = (location: Location = window.location): boolean => location.host === meetHost;

const createMeetingInfoMessage = ({ from, to }: { from: MessageSource; to: MessageDestination }): MeetMessage => {
    const currentUrl = window.location.href;
    return {
        from: from,
        to: to,
        type: MessageType.MEETING_INFO,
        meetingId: meetingId || undefined,
        data: {
            title: document.title,
            url: currentUrl.split('?')[0],
        },
    };
};

function initializeRTC(): void {
    if (!window.transcriptgen) {
        window.transcriptgen = {};
    }

    if (!window.transcriptgen.rtc) {
        window.transcriptgen.rtc = {};

        if (
            isMeetPage() &&
            (window.location.pathname.match(/\S\S\S-\S\S\S\S-\S\S\S/) || window.location.pathname === '/new')
        ) {
            const head = document.head || document.documentElement;
            injectScript(head, chrome.runtime.getURL('./inlinescripts/googlemeet/inline.googlemeet.iife.js'));

            // Initialize communication bridge
            initializeCommunicationBridge();
        }
    }
}

function initializeCommunicationBridge(): void {
    console.log('\x1b[32m%s\x1b[0m', 'initializeCommunicationBridge');
    const port = chrome.runtime.connect({ name: 'script' });

    // Create a message handler for the Meet application
    window.addEventListener('message', (event: MessageEvent) => {
        if (event.source === window && event.data && event.data.type === 'MEET_EXTENSION') {
            // Forward the message to the background script
            port.postMessage({
                ...event.data,
                meetingId: meetingId,
            });
        }
    });

    // Listen for messages from the background script
    port.onMessage.addListener((message: MeetMessage) => {
        //console.log('\x1b[32m%s\x1b[0m', 'message -> chrome.runtime.onMessage', message);
        if (message.to === 'script') {
        }
    });
}

function notifyCaptionsStatus(isCaptioning: boolean): void {
    window.dispatchEvent(
        new CustomEvent('meet-message', {
            detail: {
                type: 'CAPTIONS_STATUS',
                data: { isCaptioning },
            },
        }),
    );
}

function injectScript(target: HTMLElement, src: string): void {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    script.setAttribute('data-extension-id', chrome.runtime.id);
    target.prepend(script);
}

function connectInlineToBackground(): { inlinePort: chrome.runtime.Port; scriptPort: chrome.runtime.Port } {
    const inlinePort = chrome.runtime.connect({ name: 'inline' });
    const scriptPort = chrome.runtime.connect({ name: 'script' });

    console.log('Adding listener -> inlinePanel');
    // Handle messages from the background script
    inlinePort.onMessage.addListener((message: MeetMessage) => {
        console.log(`[inlinePort]${message.from} -> ${message.to}`, message);
        switch (message.type) {
            case MessageType.TOGGLE:
                if (!sidePanelContainer) {
                    sidePanelContainer = createSidePanel();
                }
                toggleSidePanel(sidePanelContainer);
                break;

            case MessageType.REQUEST_MEETING_INFO:
                chrome.runtime.sendMessage(
                    createMeetingInfoMessage({ from: MessageSource.inline, to: MessageDestination.sidePanel }),
                );
                break;
            /* case MessageType.VIDEO_TOGGLE:
                if (window.transcriptgen.rtc) {
                    if (message.data.enabled) {
                        // Enable video streaming
                        window.transcriptgen.rtc.videoEnabled = true;
                    } else {
                        // Disable video streaming
                        window.transcriptgen.rtc.videoEnabled = false;
                    }
                }
                break; */
        }
    });

    scriptPort.onMessage.addListener((message: MeetMessage) => {
        console.log(`[scriptPort]${message.from} -> ${message.to}`, message);
        window.dispatchEvent(
            new CustomEvent('meet-message', {
                detail: message,
            }),
        );
    });

    return { inlinePort, scriptPort };
}

function addAssistantMessageListener(): void {
    document.documentElement.addEventListener(
        'assistant-message',
        ((e: CustomEvent) => {
            chrome.runtime.sendMessage({
                ...e.detail,
                meetingId: meetingId,
            });
        }) as EventListener,
        false,
    );
}

function createSidePanel(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'meet-sales-assistant-container';
    container.style.cssText = `
        position: fixed;
        top: 0;
        right: -400px;
        width: 400px;
        height: 100vh;
        background: #f3f4f6;
        z-index: 999999;
        transition: right 0.3s ease-in-out;
        box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
    `;

    // Create iframe for the side panel content
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('side-panel/index.html');
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
    `;
    container.appendChild(iframe);

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'meet-sales-assistant-side-toggle';
    toggleButton.style.cssText = `
        position: absolute;
        left: -32px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 64px;
        background: #f3f4f6;
        border: none;
        border-radius: 8px 0 0 8px;
        cursor: pointer;
        display: none; // Initially hidden
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        color: black;
    `;

    const updateToggleIcon = (): void => {
        const isOpen = container.style.right === '0px';
        toggleButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="${isOpen ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}"/>
            </svg>
        `;
    };

    // Initial icon state
    updateToggleIcon();

    toggleButton.addEventListener('mouseenter', () => {
        //toggleButton.style.background = '#7e22ce';
    });
    toggleButton.addEventListener('mouseleave', () => {
        //toggleButton.style.background = '#9333ea';
    });
    toggleButton.addEventListener('click', () => {
        toggleSidePanel(container);
        // Update icon after transition
        setTimeout(updateToggleIcon, 300);
    });

    container.appendChild(toggleButton);
    document.body.appendChild(container);

    return container;
}

// Toggle the side panel visibility
const toggleSidePanel = (container: HTMLDivElement): void => {
    const isVisible = container.style.right === '0px';
    container.style.right = isVisible ? '-400px' : '0px';

    // Update the iframe URL with latest title when opening the panel
    if (!isVisible) {
        // Send updated meeting info
        chrome.runtime.sendMessage(
            createMeetingInfoMessage({ from: MessageSource.inline, to: MessageDestination.sidePanel }),
        );
    }
};

// Listen for storage changes to handle auto-captions toggle
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.options) {
        const newOptions = changes.options.newValue;
        const oldOptions = changes.options.oldValue || {};

        // Only handle changes to autoCaptions
        if (newOptions.autoCaptions !== oldOptions.autoCaptions) {
            if (newOptions.autoCaptions) {
                const captionsButton = document.querySelector(
                    'button[aria-label="Turn on captions"]',
                ) as HTMLButtonElement;
                if (captionsButton) {
                    captionsButton.click();
                    notifyCaptionsStatus(true);
                }
            }
        }
    }
});

const checkCaptionsButton = async (initializeCaptions: boolean = false): Promise<void> => {
    const captionsButton = document.querySelector('button[aria-label="Turn on captions"]') as HTMLButtonElement;
    const captionsVisible = document.querySelector('[aria-label="Captions are on"]');
    //console.log('captionsButton ------->', captionsButton);
    if (captionsButton) {
        updateMeetingReadyState(true);
        document.documentElement.dispatchEvent(
            new CustomEvent('assistant-message', {
                detail: {
                    type: 'MEETING_READY',
                    data: { isReady: true },
                    from: MessageDestination.inline,
                    to: MessageDestination.sidePanel,
                },
            }),
        );

        if (initializeCaptions) {
            //console.log('########## 1',captionsButton);
            captionsButton.click();
            notifyCaptionsStatus(true);
            setTimeout(() => {
                // Auto close captions (but keep capturing them)
                //console.log('########## 2',captionsButton);
                captionsButton.click();
            }, 500);
        }
    } else if (captionsVisible) {
        notifyCaptionsStatus(true);
    } else {
        setTimeout(() => checkCaptionsButton(initializeCaptions), 1000);
    }
};

async function init(): Promise<void> {
    meetingId = extractMeetingId(window.location.href);
    console.log('meetingId', meetingId);
    initializeRTC();
    connectInlineToBackground();
    addAssistantMessageListener();

    // Wait for DOM to be ready before creating UI elements
    document.addEventListener('DOMContentLoaded', async () => {
        if (isMeetPage()) {
            sidePanelContainer = createSidePanel();

            // Check for auto-captions setting and click the button if enabled
            const autoCaptions = await getAutoCaptions();
            await checkCaptionsButton(autoCaptions);
            console.log('[injector] meetingId', meetingId);
        }
    });
}

// Initialize the extension
init();
