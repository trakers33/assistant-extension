import React, { useState, useEffect } from 'react';
import { getWebSocketConfig, setWebSocketConfig, WebSocketConfig } from '@extension/storage/lib/ws-config';

function App() {
    const [config, setConfig] = useState<WebSocketConfig>({
        endpoint: '',
        enabled: false
    });

    useEffect(() => {
        const loadConfig = async () => {
            const savedConfig = await getWebSocketConfig();
            setConfig(savedConfig);
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        await setWebSocketConfig(config);
        // Show success message
        alert('WebSocket configuration saved!');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6">WebSocket Configuration</h1>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            WebSocket Endpoint
                        </label>
                        <input
                            type="text"
                            value={config.endpoint}
                            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                            placeholder="ws://your-endpoint.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="enabled"
                            checked={config.enabled}
                            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
                            Enable WebSocket Streaming
                        </label>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App; 