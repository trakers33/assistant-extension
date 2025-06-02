export interface InsightsToggleProps {
    isActive: boolean;
    onToggle: () => void;
}

export const InsightsToggle = ({ isActive, onToggle }: InsightsToggleProps) => {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-100">Active</span>
            <button
                onClick={onToggle}
                className="relative w-8 h-4 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{
                    backgroundColor: isActive ? '#3b82f6' : '#d1d5db',
                }}
                aria-checked={isActive}
                role="switch">
                <span
                    className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out"
                    style={{
                        transform: isActive ? 'translateX(16px)' : 'translateX(0)',
                    }}
                />
            </button>
        </div>
    );
};
