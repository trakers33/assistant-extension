import { useEffect } from 'react';
import { ToastProps } from '../types';

export const Toast = ({ message, isVisible, onClose }: ToastProps) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">{message}</div>
        </div>
    );
};
