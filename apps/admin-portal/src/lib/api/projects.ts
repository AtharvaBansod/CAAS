import { apiClient } from '../api-client';

export type ProjectEnvironment = 'development' | 'staging' | 'production';

export interface ProjectRecord {
    project_id: string;
    name: string;
    stack: string;
    environment: ProjectEnvironment;
    status: 'active' | 'archived';
    created_at: string;
}

export const projectsApi = {
    list: () =>
        apiClient.get<{ projects: ProjectRecord[] }>('/api/v1/auth/client/projects'),

    create: (data: { name: string; stack: string; environment: ProjectEnvironment }) =>
        apiClient.post<{ project: ProjectRecord; active_project_id: string }>('/api/v1/auth/client/projects', data),

    select: (projectId: string) =>
        apiClient.post<{
            active_project_id: string;
            project: ProjectRecord;
            message: string;
        }>('/api/v1/auth/client/projects/select', { project_id: projectId }),

    update: (
        projectId: string,
        data: Partial<Pick<ProjectRecord, 'name' | 'stack' | 'environment'>>
    ) =>
        apiClient.request<{
            project: ProjectRecord;
            message: string;
        }>('PATCH', `/api/v1/auth/client/projects/${encodeURIComponent(projectId)}`, data),

    archive: (projectId: string) =>
        apiClient.post<{
            archived_project: ProjectRecord;
            active_project: ProjectRecord;
            message: string;
        }>(`/api/v1/auth/client/projects/${encodeURIComponent(projectId)}/archive`),
};
