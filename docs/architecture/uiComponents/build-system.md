# UI Components - NPM Package Build System

> **Parent Roadmap**: [UI Components](../../roadmaps/6_uiComponents.md)

---

## Overview

Build system configuration for the @caas/ui package, optimizing for tree-shaking, bundle size, and developer experience.

---

## Tasks

### 1. Monorepo Structure

#### 1.1 Package Organization
```
@caas/ui/
├── packages/
│   ├── core/                    # Core utilities (no React dependency)
│   │   ├── src/
│   │   │   ├── theme/          # Theme tokens
│   │   │   ├── utils/          # Shared utilities
│   │   │   └── types/          # TypeScript types
│   │   └── package.json
│   │
│   ├── react/                   # React components
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── hooks/          # React hooks
│   │   │   └── providers/      # Context providers
│   │   └── package.json
│   │
│   └── themes/                  # Pre-built themes
│       ├── default-light/
│       ├── default-dark/
│       └── package.json
│
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```
- [ ] pnpm workspace configuration
- [ ] Turborepo for build orchestration
- [ ] Package interdependencies
- [ ] Shared dev dependencies

#### 1.2 pnpm Workspace Config
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

### 2. Build Configuration

#### 2.1 Rollup Configuration
```typescript
// rollup.config.ts
import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

export default defineConfig([
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,      // Tree-shaking support
      preserveModulesRoot: 'src'
    },
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: 'dist/types'
      })
    ],
    external: ['react', 'react-dom']
  },
  // CJS build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.build.json' }),
      terser()
    ],
    external: ['react', 'react-dom']
  }
]);
```
- [ ] ESM output with preserveModules
- [ ] CJS output for legacy support
- [ ] Source maps generation
- [ ] TypeScript declaration files

#### 2.2 TypeScript Configuration
```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationDir": "dist/types",
    "rootDir": "src",
    "noEmit": false
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts", "**/*.stories.tsx"]
}
```
- [ ] Strict TypeScript mode
- [ ] Declaration file generation
- [ ] Path aliases configuration

### 3. Package.json Configuration

#### 3.1 Main Package Export
```json
{
  "name": "@caas/ui",
  "version": "1.0.0",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./components/*": {
      "import": "./dist/esm/components/*/index.js",
      "require": "./dist/cjs/components/*/index.js"
    },
    "./hooks": {
      "import": "./dist/esm/hooks/index.js",
      "require": "./dist/cjs/hooks/index.js"
    },
    "./themes/*": "./dist/themes/*.css"
  },
  "sideEffects": ["**/*.css"],
  "files": ["dist"],
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "vitest",
    "storybook": "storybook dev -p 6006",
    "size": "size-limit",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```
- [ ] Dual ESM/CJS exports
- [ ] Subpath exports for tree-shaking
- [ ] sideEffects for CSS files
- [ ] Peer dependency configuration

### 4. Bundle Size Optimization

#### 4.1 Size Limit Configuration
```json
// .size-limit.json
[
  {
    "name": "Full bundle",
    "path": "dist/esm/index.js",
    "limit": "50 KB",
    "import": "*"
  },
  {
    "name": "ChatList only",
    "path": "dist/esm/index.js",
    "limit": "15 KB",
    "import": "{ ChatList }"
  },
  {
    "name": "ChatWindow only",
    "path": "dist/esm/index.js",
    "limit": "20 KB",
    "import": "{ ChatWindow }"
  }
]
```
- [ ] Per-component size limits
- [ ] CI check for bundle size
- [ ] Size comparison on PRs

#### 4.2 Tree-Shaking Verification
```typescript
// scripts/verify-treeshaking.ts
import { analyzeMetafile } from 'esbuild';

// Verify unused code is eliminated
async function verifyTreeShaking() {
  const result = await build({
    entryPoints: ['./test-import.ts'],
    bundle: true,
    metafile: true,
    write: false
  });
  
  const analysis = await analyzeMetafile(result.metafile);
  console.log(analysis);
}
```
- [ ] Tree-shaking test script
- [ ] Bundle analysis visualization
- [ ] Dead code detection

### 5. Development Workflow

#### 5.1 Storybook Configuration
```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-themes'
  ],
  framework: '@storybook/react-vite',
  docs: { autodocs: true }
};

export default config;
```
- [ ] Storybook 7+ setup
- [ ] Auto-generated docs
- [ ] Accessibility addon
- [ ] Theme switching

#### 5.2 Development Build
```typescript
// Dev mode with watch
"scripts": {
  "dev": "rollup -c -w",
  "dev:storybook": "storybook dev -p 6006"
}
```
- [ ] Watch mode for development
- [ ] HMR in Storybook
- [ ] Source map debugging

### 6. CI/CD Pipeline

#### 6.1 Build Pipeline
```yaml
# .github/workflows/build.yml
name: Build & Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run test
      - run: pnpm run size
```
- [ ] Automated build on PR
- [ ] Bundle size check
- [ ] Test execution

#### 6.2 NPM Publishing
```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
- [ ] Semantic versioning
- [ ] Changelog generation
- [ ] NPM publish automation

---

## Bundle Size Targets

| Export | Max Size (gzip) |
|--------|-----------------|
| Full Bundle | 50 KB |
| Core Only | 10 KB |
| Single Component | 5-15 KB |
| CSS Themes | 5 KB |

---

## Related Documents

- [Theming Architecture](./theming.md)
- [Chat List Implementation](./chat-list.md)
