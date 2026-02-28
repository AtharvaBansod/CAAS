'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { type AuthUser, decodeToken, getAccessToken, getCsrfToken, clearTokens, isTokenExpired } from '@/lib/auth';
import { projectsApi, type ProjectEnvironment, type ProjectRecord } from '@/lib/api/projects';

export interface TenantProject {
    id: string;
    name: string;
    stack: string;
    environment: ProjectEnvironment;
}

interface AuthContextValue {
    user: AuthUser | null;
    projects: TenantProject[];
    activeProject: TenantProject | null;
    setActiveProject: (projectId: string) => Promise<{ success: boolean; error?: string }>;
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
    project?: {
        name: string;
        stack: string;
        environment: ProjectEnvironment;
    };
}

const AuthContext = React.createContext<AuthContextValue>({
    user: null,
    projects: [],
    activeProject: null,
    setActiveProject: async () => ({ success: false }),
    isAuthenticated: false,
    isLoading: true,
    login: async () => ({ success: false }),
    register: async () => ({ success: false }),
    logout: () => { },
});

function normalizeProject(project: ProjectRecord): TenantProject {
    return {
        id: project.project_id,
        name: project.name,
        stack: project.stack,
        environment: project.environment,
    };
}

export function useAuth() {
    return React.useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [projects, setProjects] = React.useState<TenantProject[]>([]);
    const [activeProject, setActiveProjectState] = React.useState<TenantProject | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const router = useRouter();

    const persistProjects = React.useCallback((projectList: TenantProject[], activeProjectId?: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('caas_projects', JSON.stringify(projectList));
        if (activeProjectId) {
            localStorage.setItem('caas_active_project_id', activeProjectId);
        }
    }, []);

    const restoreProjectsFromStorage = React.useCallback(() => {
        if (typeof window === 'undefined') return [] as TenantProject[];
        const raw = localStorage.getItem('caas_projects');
        if (!raw) return [] as TenantProject[];
        try {
            return JSON.parse(raw) as TenantProject[];
        } catch {
            return [] as TenantProject[];
        }
    }, []);

    const fallbackSyncProjectContext = React.useCallback((decodedUser: AuthUser | null) => {
        if (typeof window === 'undefined') return;

        const existingProjects = restoreProjectsFromStorage();
        const mergedProjects = [...existingProjects];
        if (decodedUser?.projectId) {
            const tokenProject: TenantProject = {
                id: decodedUser.projectId,
                name: decodedUser.projectId.slice(0, 8),
                stack: decodedUser.projectStack || 'custom',
                environment: decodedUser.projectEnvironment || 'development',
            };

            const existingIdx = mergedProjects.findIndex((project) => project.id === tokenProject.id);
            if (existingIdx >= 0) {
                mergedProjects[existingIdx] = {
                    ...mergedProjects[existingIdx],
                    stack: tokenProject.stack,
                    environment: tokenProject.environment,
                };
            } else {
                mergedProjects.push(tokenProject);
            }
        }

        const preferredProjectId =
            localStorage.getItem('caas_active_project_id') ||
            decodedUser?.projectId ||
            mergedProjects[0]?.id;

        const selectedProject = preferredProjectId
            ? mergedProjects.find((project) => project.id === preferredProjectId) || null
            : null;

        setProjects(mergedProjects);
        setActiveProjectState(selectedProject);
        if (selectedProject) {
            persistProjects(mergedProjects, selectedProject.id);
        }
    }, [persistProjects, restoreProjectsFromStorage]);

    const syncProjectsFromApi = React.useCallback(async (decodedUser: AuthUser | null) => {
        const response = await projectsApi.list();
        const mappedProjects = (response.projects || []).map(normalizeProject);
        const preferredProjectId = (typeof window !== 'undefined' && localStorage.getItem('caas_active_project_id'))
            || decodedUser?.projectId
            || mappedProjects[0]?.id;

        const selectedProject = preferredProjectId
            ? mappedProjects.find((project) => project.id === preferredProjectId) || mappedProjects[0] || null
            : mappedProjects[0] || null;

        setProjects(mappedProjects);
        setActiveProjectState(selectedProject);

        if (selectedProject) {
            persistProjects(mappedProjects, selectedProject.id);
        } else if (typeof window !== 'undefined') {
            localStorage.removeItem('caas_active_project_id');
            localStorage.setItem('caas_projects', JSON.stringify(mappedProjects));
        }
    }, [persistProjects]);

    const setActiveProject = React.useCallback(async (projectId: string) => {
        const targetProject = projects.find((project) => project.id === projectId) || null;
        if (!targetProject) {
            return { success: false, error: 'Project not found in current context' };
        }

        const previousProject = activeProject;
        setActiveProjectState(targetProject);
        if (typeof window !== 'undefined') {
            localStorage.setItem('caas_active_project_id', targetProject.id);
        }

        try {
            await projectsApi.select(projectId);
            return { success: true };
        } catch (error: any) {
            setActiveProjectState(previousProject || null);
            if (typeof window !== 'undefined') {
                if (previousProject?.id) {
                    localStorage.setItem('caas_active_project_id', previousProject.id);
                } else {
                    localStorage.removeItem('caas_active_project_id');
                }
            }
            return { success: false, error: error.message || 'Failed to update active project' };
        }
    }, [activeProject, projects]);

    React.useEffect(() => {
        const init = async () => {
            const token = getAccessToken();
            if (token && !isTokenExpired(token)) {
                const decodedUser = decodeToken(token);
                setUser(decodedUser);
                try {
                    await syncProjectsFromApi(decodedUser);
                } catch {
                    fallbackSyncProjectContext(decodedUser);
                }
            } else if (typeof window !== 'undefined') {
                const parsedProjects = restoreProjectsFromStorage();
                const activeProjectId = localStorage.getItem('caas_active_project_id');
                setProjects(parsedProjects);
                setActiveProjectState(parsedProjects.find((project) => project.id === activeProjectId) || parsedProjects[0] || null);
            }
            setIsLoading(false);
        };

        void init();
    }, [fallbackSyncProjectContext, restoreProjectsFromStorage, syncProjectsFromApi]);

    const login = React.useCallback(async (email: string, password: string) => {
        try {
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

            const token = getAccessToken();
            if (token) {
                const decodedUser = decodeToken(token);
                setUser(decodedUser);
                try {
                    await syncProjectsFromApi(decodedUser);
                } catch {
                    fallbackSyncProjectContext(decodedUser);
                }
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Login failed' };
        }
    }, [fallbackSyncProjectContext, syncProjectsFromApi]);

    const register = React.useCallback(async (data: RegisterData) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include',
            });
            const res = await response.json() as {
                client_id: string;
                tenant_id: string;
                project_id?: string;
                api_key: string;
                api_secret: string;
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                return { success: false, error: res.error || res.message || 'Registration failed' };
            }

            if (data.project && typeof window !== 'undefined') {
                const projectId = res.project_id || crypto.randomUUID();
                const currentProjects = restoreProjectsFromStorage();
                const mergedProjects = [
                    ...currentProjects,
                    {
                        id: projectId,
                        name: data.project.name,
                        stack: data.project.stack,
                        environment: data.project.environment,
                    },
                ];
                setProjects(mergedProjects);
                setActiveProjectState(mergedProjects[mergedProjects.length - 1]);
                persistProjects(mergedProjects, projectId);
            }

            return { success: true, apiKey: res.api_key };
        } catch (error: any) {
            return { success: false, error: error.message || 'Registration failed' };
        }
    }, [persistProjects, restoreProjectsFromStorage]);

    const logout = React.useCallback(async () => {
        try {
            const csrfToken = getCsrfToken();
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
            });
        } catch {
            // noop
        }
        clearTokens();
        setUser(null);
        setProjects([]);
        setActiveProjectState(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('caas_projects');
            localStorage.removeItem('caas_active_project_id');
        }
        router.push('/login');
    }, [router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                projects,
                activeProject,
                setActiveProject,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
