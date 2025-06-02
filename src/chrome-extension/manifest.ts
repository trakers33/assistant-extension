import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
    manifest_version: 3,
    default_locale: 'en',
    name: '__MSG_extensionName__',
    browser_specific_settings: {
        gecko: {
            id: 'example@example.com',
            strict_min_version: '109.0',
        },
    },
    version: packageJson.version,
    description: '__MSG_extensionDescription__',
    host_permissions: ['<all_urls>'],
    permissions: [
        'identity',
        'storage',
        'scripting',
        'tabs',
        'notifications',
        'tabCapture',
        'clipboardWrite',
        'activeTab',
        'sidePanel',
    ],
    oauth2: {
        client_id: '264703403342-ruk7uvthi61643umhohhjtl1suv4mfv4.apps.googleusercontent.com',
        scopes: ['openid', 'email', 'profile'],
    },
    options_page: 'options/index.html',
    background: {
        service_worker: 'background/background.js',
        type: 'module',
    },
    action: {
        default_icon: 'icon-34.png',
    },
    /*chrome_url_overrides: {
    newtab: 'new-tab/index.html',
  },*/
    icons: {
        128: 'icon-128.png',
    },
    content_scripts: [
        {
            matches: ['*://meet.google.com/*'],
            js: ['inlines/injector/inline.injector.iife.js'],
            css: ['inlines/injector/injector.css'],
            run_at: 'document_start',
        },
    ],
    //devtools_page: 'devtools/index.html',
    web_accessible_resources: [
        {
            resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'side-panel/*', 'inlinescripts/*'],
            matches: ['*://meet.google.com/*'],
        },
    ],
} satisfies chrome.runtime.ManifestV3;

export default manifest;
