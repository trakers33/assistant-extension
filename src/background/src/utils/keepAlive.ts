export const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);

export function setupKeepAlive() {
    chrome.runtime.onStartup.addListener(keepAlive);
    keepAlive();
}
