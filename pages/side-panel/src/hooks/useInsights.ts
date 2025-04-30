import { useState, useEffect } from 'react';
import { storage, runtime } from 'webextension-polyfill';
import { Insight, StorageResult } from '@extension/shared/lib/types';

const DEFAULT_INSIGHTS: Insight[] = [
    {
        id: 1,
        title: 'Long Monologue',
        message: 'Long monologue detected. Take a pause and ask some questions.',
        time: '4 min ago',
    },
    {
        id: 2,
        title: 'Question Opportunity',
        message: 'Customer expressed interest in pricing. Consider discussing package options.',
        time: '2 min ago',
    },
];

export const useInsights = () => {
    const [isInsightsActive, setIsInsightsActive] = useState(true);
    const [insights, setInsights] = useState<Insight[]>(DEFAULT_INSIGHTS);
    const [currentInsight, setCurrentInsight] = useState(0);

    useEffect(() => {
        const loadInsightsState = async () => {
            try {
                const result = (await storage.local.get('insightsActive')) as StorageResult;
                setIsInsightsActive(result.insightsActive ?? true);
            } catch (error) {
                console.error('Error loading insights state:', error);
            }
        };
        loadInsightsState();
    }, []);

    const toggleInsights = async () => {
        const newState = !isInsightsActive;
        setIsInsightsActive(newState);
        try {
            await storage.local.set({ insightsActive: newState });
            await runtime.sendMessage({
                type: 'TOGGLE_INSIGHTS',
                active: newState,
            });
        } catch (error) {
            console.error('Error saving insights state:', error);
        }
    };

    const removeInsight = (id: number) => {
        setInsights(insights.filter(insight => insight.id !== id));
        if (currentInsight >= insights.length - 1) {
            setCurrentInsight(Math.max(0, insights.length - 2));
        }
    };

    const navigateInsight = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            setCurrentInsight(Math.max(0, currentInsight - 1));
        } else {
            setCurrentInsight(Math.min(insights.length - 1, currentInsight + 1));
        }
    };

    return {
        isInsightsActive,
        insights,
        currentInsight,
        toggleInsights,
        removeInsight,
        navigateInsight,
    };
};
