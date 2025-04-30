import { runtime } from 'webextension-polyfill';

console.log('[content] loaded ');

document.documentElement.addEventListener(
    'transcriptgen-message',
    (e: any) => {
        console.log('custom event ', e.detail);
        runtime.sendMessage({ from: 'content', to: 'background', detail: e.detail });
    },
    false,
);
