import React, { useEffect } from 'react';

export interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    isLight?: boolean;
}

export const Toast = ({ message, isVisible, onClose, isLight = true }: ToastProps) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
                isLight 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-900 text-white border border-gray-700'
            }`}>
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">{message}</span>
            </div>
        </div>
    );
};
