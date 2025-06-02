import { handleTabOpening } from './sidePanel';

export function setupTabListeners() {
    chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
        if (!tabId) return;
        const tab = await chrome.tabs.get(tabId);
        handleTabOpening(tab);
    });
    chrome.tabs.onRemoved.addListener(tabId => {
        // You may want to clean up state here
    });
}
