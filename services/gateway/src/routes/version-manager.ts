import { FastifyRequest } from 'fastify';

export enum ApiVersion {
  V1 = 'v1',
}

export const SUPPORTED_VERSIONS = Object.values(ApiVersion);
export const DEFAULT_VERSION = ApiVersion.V1;

export interface VersionInfo {
  version: ApiVersion;
  source: 'path' | 'header' | 'accept' | 'default';
}

export class VersionManager {
  static getVersion(request: FastifyRequest): VersionInfo {
    // 1. Path (highest priority)
    // /v1/some/path -> v1
    // /api/v1/some/path -> v1
    const pathMatch = request.url.match(/^\/(?:api\/)?(v\d+)\//);
    if (pathMatch && this.isValidVersion(pathMatch[1])) {
      return { version: pathMatch[1] as ApiVersion, source: 'path' };
    }

    // 2. Header
    const headerVersion = request.headers['x-api-version'];
    if (typeof headerVersion === 'string' && this.isValidVersion(headerVersion)) {
      return { version: headerVersion as ApiVersion, source: 'header' };
    }

    // 3. Accept Header
    const acceptHeader = request.headers.accept;
    if (acceptHeader) {
      const match = acceptHeader.match(/vnd\.caas\.(v\d+)\+json/);
      if (match && this.isValidVersion(match[1])) {
        return { version: match[1] as ApiVersion, source: 'accept' };
      }
    }

    // 4. Default
    return { version: DEFAULT_VERSION, source: 'default' };
  }

  static isValidVersion(version: string): boolean {
    return SUPPORTED_VERSIONS.includes(version as ApiVersion);
  }
}
