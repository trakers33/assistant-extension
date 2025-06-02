export const handleTabOpening = async (tab: chrome.tabs.Tab) => {
    try {
        const existingOptions = await chrome.sidePanel.getOptions({ tabId: tab.id });
        /** Remove by default **/
        if (!existingOptions.enabled) {
            await chrome.sidePanel.setOptions({
                tabId: tab.id,
                enabled: false,
                path: 'side-panel/index.html',
            });
        }
        /**  Filter Tabs **/
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: true,
            path: 'side-panel/index.html',
        });
    } catch (e) {
        //console.log('Issue handleTabOpening',e);
    }
};

export function setupSidePanelBehavior() {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}
