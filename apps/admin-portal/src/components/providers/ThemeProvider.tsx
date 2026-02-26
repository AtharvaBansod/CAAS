'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = React.useState<'light' | 'dark'>('dark');

    React.useEffect(() => {
        const stored = localStorage.getItem('caas-theme') as 'light' | 'dark' | null;
        const preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(preferred);
        document.documentElement.classList.toggle('dark', preferred === 'dark');
    }, []);

    const toggleTheme = React.useCallback(() => {
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('caas-theme', next);
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

interface ThemeContextValue {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => { },
});

export function useTheme() {
    return React.useContext(ThemeContext);
}

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
}
