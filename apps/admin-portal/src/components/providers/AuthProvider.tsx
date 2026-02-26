'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { type AuthUser, decodeToken, getAccessToken, setTokens, clearTokens, isTokenExpired } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

/* ─── Context ────────────────────────────────────────── */
interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; apiKey?: string; error?: string }>;
    logout: () => Promise<void> | void;
}

interface RegisterData {
    company_name: string;
    email: string;
    password: string;
    plan?: string;
}

const AuthContext = React.createContext<AuthContextValue>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: async () => ({ success: false }),
    register: async () => ({ success: false }),
    logout: () => { },
});

export function useAuth() {
    return React.useContext(AuthContext);
}

/* ─── Provider ───────────────────────────────────────── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const router = useRouter();

    // Initialize from stored token
    React.useEffect(() => {
        const token = getAccessToken();
        if (token && !isTokenExpired(token)) {
            setUser(decodeToken(token));
        }
        setIsLoading(false);
    }, []);

    const login = React.useCallback(async (email: string, password: string) => {
        try {
            // Call the Next.js proxy route so httpOnly cookies get set server-side
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, error: data.error || 'Invalid credentials' };
            }

            // The proxy sets cookies; read the access token from cookie for JS use
            const token = getAccessToken();
            if (token) {
                setUser(decodeToken(token));
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Login failed' };
        }
    }, []);

    const register = React.useCallback(async (data: RegisterData) => {
        try {
            const res = await apiClient.post<{
                client_id: string;
                tenant_id: string;
                api_key: string;
                api_secret: string;
            }>('/api/v1/auth/client/register', data);

            return { success: true, apiKey: res.api_key };
        } catch (error: any) {
            return { success: false, error: error.message || 'Registration failed' };
        }
    }, []);

    const logout = React.useCallback(async () => {
        try {
            // Call the Next.js proxy to clear httpOnly cookies server-side
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
        clearTokens();
        setUser(null);
        router.push('/login');
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
