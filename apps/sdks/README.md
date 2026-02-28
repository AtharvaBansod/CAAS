# SDK Workspace Layout

This directory groups SDKs by usage type.

## Backend SDKs (tenant server-side)
- `apps/sdks/backend/sdk-node-ts`
- `apps/sdks/backend/sdk-python`
- `apps/sdks/backend/sdk-java`
- `apps/sdks/backend/sdk-dotnet`
- `apps/sdks/backend/sdk-ruby`
- `apps/sdks/backend/sdk-rust`

Purpose: API-key based server-side integration for end-user token/session generation via gateway SDK routes.

## Frontend SDKs (tenant client-side)
- `apps/sdks/frontend/sdk-web-core`
- `apps/sdks/frontend/sdk-react`
- `apps/sdks/frontend/sdk-angular`

Purpose: UI/API runtime integration on SaaS frontend apps using end-user tokens.

## Shared Contracts
- `apps/sdks/shared/sdk-contracts`

Purpose: canonical SDK contracts, parity matrices, conformance metadata, and governance artifacts.
