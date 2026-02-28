import { apiClient } from '../api-client';
import type { CapabilityEntry } from '../capability-map';

export interface CapabilityManifestResponse {
    generated_at: string;
    modules: CapabilityEntry[];
}

export const capabilitiesApi = {
    getManifest: () =>
        apiClient.get<CapabilityManifestResponse>('/api/v1/admin/capabilities'),
};
