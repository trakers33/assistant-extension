'use strict';

import { runtime } from 'webextension-polyfill';

(() => {
    const meetHost = 'meet.google.com';

    const isMeetPage = (location = window.location) => location.host === meetHost;

    function initializeRTC() {
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
                injectScript(head, runtime.getURL('./static/js/googlemeet.js'));
            }
        }
    }

    function injectScript(target, src) {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        target.prepend(script);
    }

    function init() {
        initializeRTC();
    }

    init();
})();
