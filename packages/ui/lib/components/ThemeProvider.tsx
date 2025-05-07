import { createContext, useContext, useEffect, useState } from 'react';
import { themeStorage } from '@extension/storage';

export type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
    children: React.ReactNode;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>('light');

    // On mount, read theme from chrome storage and subscribe to changes
    useEffect(() => {
        let unsub: (() => void) | undefined;
        themeStorage.get().then(storedTheme => {
            setThemeState(storedTheme);
        });
        unsub = themeStorage.subscribe(async () => {
            console.log('themeStorage.subscribe change !!!');
            const storedTheme = await themeStorage.get();
            setThemeState(storedTheme);
        });
        return () => {
            if (unsub) unsub();
        };
    }, []);

    // Update document class when theme changes
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
            return;
        }
        root.classList.add(theme);
    }, [theme]);

    // setTheme updates both local state and chrome storage
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        themeStorage.set(newTheme as 'light' | 'dark');
    };

    const value = {
        theme,
        setTheme,
    };

    return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
