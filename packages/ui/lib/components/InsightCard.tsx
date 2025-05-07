import React from 'react';

export interface Insight {
    id: number;
    title: string;
    message: string;
    time: string;
}

export interface InsightCardProps {
    insight: Insight;
    onRemove: (id: number) => void;
    totalInsights: number;
    currentIndex: number;
    onNavigate: (direction: 'prev' | 'next') => void;
    isLight?: boolean;
    className?: string;
}

export const InsightCard = ({
    insight,
    onRemove,
    totalInsights,
    currentIndex,
    onNavigate,
    isLight = true,
    className = '',
}: InsightCardProps) => {
    return (
        <div
            className={`${
                isLight ? 'bg-white border-gray-100 text-gray-900' : 'bg-gray-800 border-gray-700 text-white'
            } p-3 rounded-lg border shadow-sm ${className}`}>
            <div className="flex justify-between items-start mb-2">
                <p className={`text-[15px] font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{insight.title}</p>
                <button
                    onClick={() => onRemove(insight.id)}
                    className={`p-1 rounded-full transition-colors ${
                        isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                    }`}
                    aria-label="Dismiss insight">
                    <svg
                        className={`w-4 h-4 ${
                            isLight ? 'text-gray-400 hover:text-gray-600' : 'text-white hover:text-gray-300'
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-white'}`}>{insight.message}</p>
            <div className="mt-2 flex items-center justify-between">
                <p className={`text-base flex items-center gap-2 ${isLight ? 'text-gray-500' : 'text-white'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="text-sm">{insight.time}</span>
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNavigate('prev')}
                        disabled={currentIndex === 0}
                        className={`p-1 rounded-full transition-colors ${
                            currentIndex === 0
                                ? isLight
                                    ? 'text-gray-300'
                                    : 'text-gray-600'
                                : isLight
                                  ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                  : 'text-white hover:bg-gray-700 hover:text-white'
                        }`}
                        aria-label="Previous insight">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className={`text-xs min-w-[3ch] text-center ${isLight ? 'text-gray-500' : 'text-white'}`}>
                        {currentIndex + 1}/{totalInsights}
                    </span>
                    <button
                        onClick={() => onNavigate('next')}
                        disabled={currentIndex === totalInsights - 1}
                        className={`p-1 rounded-full transition-colors ${
                            currentIndex === totalInsights - 1
                                ? isLight
                                    ? 'text-gray-300'
                                    : 'text-gray-600'
                                : isLight
                                  ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                  : 'text-white hover:bg-gray-700 hover:text-white'
                        }`}
                        aria-label="Next insight">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
