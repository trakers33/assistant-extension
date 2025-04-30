import React, { useState } from 'react';
import { Header } from './Header';
import { ParticipantsSection } from './ParticipantsSection';

const SidePanel: React.FC = () => {
    const [isLight, setIsLight] = useState(true);
    const [title, setTitle] = useState('Side Panel');
    const [url, setUrl] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [participants, setParticipants] = useState([]);

    const handleMinimize = async () => {
        setIsExpanded(false);
    };

    const handleExpand = async () => {
        setIsExpanded(true);
    };

    return (
        <div className={`flex flex-col h-screen ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
            <Header
                isLight={isLight}
                title={title}
                url={url}
                onMinimize={handleMinimize}
                onExpand={handleExpand}
                isExpanded={isExpanded}
            />
            <div className="flex-1 overflow-auto p-4">
                <ParticipantsSection participants={participants} isLight={isLight} />
            </div>
        </div>
    );
};

export default SidePanel; 