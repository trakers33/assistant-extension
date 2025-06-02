import { createRoot } from 'react-dom/client';
import { App } from './components/react/App';
import React from 'react';

// Create root element
const root = document.createElement('div');
root.id = 'meet-sales-assistant-root';
document.body.appendChild(root);

// Add animations
const animationsStyle = document.createElement('style');
animationsStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
    }
`;
document.head.appendChild(animationsStyle);

// Render React app
const appRoot = createRoot(root);
appRoot.render(React.createElement(App));
