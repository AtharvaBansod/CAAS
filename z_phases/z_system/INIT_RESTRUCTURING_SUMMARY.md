# Initialization & Environment Restructuring

**Date:** 2026-02-09  
**Action:** Moved initialization logic to services and clarified env var strategy

---

## ✅ Initialization Restructuring

### 1. MongoDB Initialization Moved
The MongoDB initialization logic has been moved from `init/mongodb/` to `services/mongodb-service/`.

- **Old Location:** `init/mongodb/*`
- **New Location:** `services/mongodb-service/`
  - `init-db.js`: Database schema and user creation script.
  - `mongo-keyfile`: Security key for replica set.

### 2. Startup Script Updated
`start.ps1` has been updated to use the files from the service directory:
- Mounts `./services/mongodb-service/mongo-keyfile`
- Executes `./services/mongodb-service/init-db.js`

### 3. Cleanup
- **Deleted:** `init/` directory (now empty/unused).

---

## 🌍 Environment Variable Strategy

To keep configuration "aligned and manageable", we follow this pattern:

### 1. Root `.env` (Orchestration Config)
The file at `.\.env` controls the **deployment configuration** for the entire platform (Docker Compose).
- **Purpose:** Single source of truth for ports, passwords, and shared secrets across services.
- **Usage:** Used by `docker-compose.yml` to substitute variables.

### 2. Service `.env.example` (Service Contract)
Each service (e.g., `services/mongodb-service/.env.example`) documents the variables **that service expects**.
- **Purpose:** Documentation for developers working on that specific service independently.
- **Usage:** Not used by Docker Compose directly. Developers copy this to `.env` inside the service folder **only if running locally** (which we avoid in our Docker-only workflow).

### 3. Mapping in `docker-compose.yml`
Docker Compose maps the Global Config (Root `.env`) to the Service Contract.

```yaml
# docker-compose.yml
services:
  mongodb-service:
    environment:
      # Map Root Env Var -> Service Env Var
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD} 
```

### ✅ Benefits
- **Central Management:** Change a password in ONE place (root `.env`) and it propagates to all services.
- **Service Independence:** Each service clearly defines what it needs in its own folder.
- **No Duplication:** We don't maintain multiple `.env` files for deployment.

---

## 🚀 How to Manage Configuration

1. **To Change a Global Setting (e.g., Password, Port):**
   - Edit `.\.env` in the root.
   - Run `.\stop.ps1` and `.\start.ps1`.

2. **To Add a New Variable to a Service:**
   - Add it to `services/[service]/src/config.ts` (or equivalent).
   - Document it in `services/[service]/.env.example`.
   - Add the mapping in `.\docker-compose.yml`.
   - Add the value to `.\.env` (if it's a secret or configurable).

---

## ✅ Verification

**Files are now organized by Service:**

```
services/
├── mongodb-service/        ✅ Contains DB Init logic
│   ├── init-db.js
│   ├── mongo-keyfile
│   └── .env.example
├── socket-service/         ✅ Contains Socket logic
└── gateway/                ✅ Contains API logic
```

**Startup Flow:**
1. `start.ps1` reads root `.env`.
2. Starts `mongodb-primary` using keyfile from `services/mongodb-service/`.
3. Runs `init-db.js` from `services/mongodb-service/`.

**Status:** ✅ **Fully aligned with service-centric architecture.**
