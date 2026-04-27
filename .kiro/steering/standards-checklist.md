---
inclusion: manual
---

# Stackra Package Standards Checklist

Use this checklist when creating, auditing, or onboarding a new `@stackra/*`
package. Every item must pass before a package is considered production-ready.

## package.json

- [ ] `"name"` starts with `@stackra/`
- [ ] `"type": "module"`
- [ ] `"version"` follows semver
- [ ] `"license": "MIT"`
- [ ] `"author"` is `Stackra L.L.C <dev@stackra.com>`
- [ ] `"repository.url"` matches `https://github.com/stackra-inc/<repo>.git`
- [ ] `"bugs.url"` matches `https://github.com/stackra-inc/<repo>/issues`
- [ ] `"homepage"` matches `https://github.com/stackra-inc/<repo>#readme`
- [ ] `"engines.node"` is `>=22`
- [ ] `"engines.pnpm"` is `>=9.0.0`
- [ ] `"packageManager"` is `pnpm@10.33.2`
- [ ] `"sideEffects": false`

### Exports (library and config packages)

- [ ] `"main": "./dist/index.cjs"`
- [ ] `"module": "./dist/index.js"`
- [ ] `"types": "./dist/index.d.ts"`
- [ ] `"exports['.'].types"` → `./dist/index.d.ts`
- [ ] `"exports['.'].import"` → `./dist/index.js`
- [ ] `"exports['.'].require"` → `./dist/index.cjs`
- [ ] No `.mjs` references anywhere (we use `.js` for ESM with `type: module`)

### Scripts

- [ ] `build` — `tsup` (or custom for json-config)
- [ ] `dev` — `tsup --watch`
- [ ] `clean` — `rm -rf dist node_modules/.cache`
- [ ] `typecheck` — `tsc --noEmit`
- [ ] `format` — `prettier --write .`
- [ ] `format:check` — `prettier --check .`
- [ ] `test` — `vitest run --passWithNoTests`
- [ ] `test:watch` — `vitest`
- [ ] `test:coverage` — `vitest run --coverage`
- [ ] `lint` — `eslint . --max-warnings 0` (library packages only)
- [ ] `lint:fix` — `eslint . --fix` (library packages only)
- [ ] `prepare` — `husky`
- [ ] `prepublishOnly` — `pnpm run build`
- [ ] `release` — `pnpm publish --access public --no-git-checks`

### pnpm Overrides

- [ ] `eslint` pinned to `^9.28.0`
- [ ] `@eslint/js` pinned to `^9.28.0`
- [ ] `vite` pinned to `^7.2.6`

### stackra.publish (Laravel-style asset declarations)

- [ ] `config` — source and destination declared (if package has config
      templates)
- [ ] `steering` — source `.kiro/steering/`, destination
      `.kiro/steering/{module}/`
- [ ] `hooks` — source `.kiro/hooks/`, destination `.kiro/hooks/`

## Required devDependencies

### All packages

- [ ] `husky`
- [ ] `lint-staged`
- [ ] `@commitlint/cli`
- [ ] `@commitlint/config-conventional`
- [ ] `@commitlint/types`
- [ ] `prettier`
- [ ] `@stackra/prettier-config`
- [ ] `@types/node`
- [ ] `typescript`

### Library and config packages (not json-config)

- [ ] `@stackra/typescript-config`
- [ ] `@stackra/tsup-config`
- [ ] `tsup`
- [ ] `vitest`
- [ ] `jsdom`

### Library packages only

- [ ] `@stackra/eslint-config`
- [ ] `eslint`
- [ ] `eslint-plugin-turbo`
- [ ] `jiti` (required for ESLint to load .ts config)
- [ ] `typescript-eslint`

## Config Files

### tsconfig.json

- [ ] Extends `@stackra/typescript-config/base.json` (libraries) or
      `/bundler.json` (config packages)
- [ ] `outDir` and `rootDir` set locally (not in preset)
- [ ] `paths: { "@/*": ["./src/*"] }` for path alias
- [ ] `include` covers `src/**/*` and `__tests__/**/*`
- [ ] `exclude` covers `node_modules`, `dist`, `.examples`

### tsup.config.ts

- [ ] Uses `basePreset` from `@stackra/tsup-config` (libraries)
- [ ] Or custom config extending the preset (config packages)

### vitest.config.ts

- [ ] `globals: true`
- [ ] `environment: 'jsdom'`
- [ ] `setupFiles: ['./__tests__/vitest.setup.ts']`
- [ ] `include: ['__tests__/**/*.{test,spec}.{ts,tsx}']`
- [ ] `passWithNoTests: true`
- [ ] `coverage.provider: 'v8'`
- [ ] `resolve.alias: { '@': './src' }`

### .prettierrc.mjs

- [ ] Extends `@stackra/prettier-config`
- [ ] Uses `.mjs` extension (not `.json`)

### eslint.config.ts (library packages)

- [ ] Imports `viteConfig` from `@stackra/eslint-config`
- [ ] Ignores `dist/**`, `node_modules/**`, `*.config.js`, `*.config.ts`,
      `.examples/**`
- [ ] Has `turbo/no-undeclared-env-vars: 'off'`
- [ ] Has package-specific rule overrides as needed

### commitlint.config.ts

- [ ] Extends `@commitlint/config-conventional`
- [ ] Enforces conventional commit types

### .lintstagedrc.mjs

- [ ] JS/TS files: `eslint --fix` + `prettier --write`
- [ ] Other files: `prettier --write`
- [ ] json-config packages: prettier only (no eslint)

## Git Hooks (Husky)

- [ ] `.husky/pre-commit` exists and is executable (755)
- [ ] `.husky/pre-commit` runs `npx lint-staged`
- [ ] `.husky/commit-msg` exists and is executable (755)
- [ ] `.husky/commit-msg` runs `npx commitlint --edit $1`

## Scaffolding

- [ ] `.gitignore` covers dist/, node_modules/, coverage/, .DS_Store, \*.log
- [ ] `.prettierignore` covers dist/, node_modules/, coverage/, pnpm-lock.yaml,
      CHANGELOG.md
- [ ] `__tests__/vitest.setup.ts` exists
- [ ] `__tests__/setup.d.ts` exists with
      `/// <reference types="vitest/globals" />`
- [ ] `README.md` exists
- [ ] `LICENSE` exists (MIT)
- [ ] `CHANGELOG.md` exists

## CI/CD (GitHub)

### Repository settings

- [ ] GitHub repo exists at `stackra-inc/<name>`
- [ ] `allow_auto_merge` enabled
- [ ] `STACKRA_NPM_TOKEN` secret configured
- [ ] `STACKRA_SLACK_WEBHOOK_URL` secret configured (optional)
- [ ] `npm` environment created for publish protection

### Workflows

- [ ] `.github/actions/setup/action.yml` — pnpm + Node setup (no hardcoded
      versions)
- [ ] `.github/workflows/ci.yml` — runs on push to main + PRs
- [ ] `.github/workflows/publish.yml` — runs on semver tag push
- [ ] `.github/workflows/dependabot-auto-merge.yml` — auto-merges @stackra/\*
      PRs
- [ ] `.github/dependabot.yml` — daily npm, weekly GH Actions

### Workflow standards

- [ ] All actions use v5+ (`actions/checkout@v5`, `actions/setup-node@v5`)
- [ ] `actions/upload-artifact@v7`
- [ ] `softprops/action-gh-release@v3`
- [ ] `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` env set
- [ ] Publish workflow has duplicate version guard (`npm view` before publish)
- [ ] Setup action reads pnpm version from `packageManager` (no hardcoded
      version)

### Banner

- [ ] `.github/assets/banner.svg` exists
- [ ] `.github/assets/banner.png` exists (generated from SVG)

## Kiro Integration

- [ ] `.kiro/steering/` contains shared steering files (6 files)
- [ ] Package-specific steering files if applicable
- [ ] `.kiro/hooks/` contains hooks if applicable (e.g., svg-to-png)

## Quality Gate (must pass before publish)

- [ ] `pnpm build` — succeeds
- [ ] `pnpm format:check` — no formatting issues
- [ ] `pnpm typecheck` — no type errors
- [ ] `pnpm lint` — zero warnings (library packages)
- [ ] `pnpm test` — all tests pass

## Publishing

- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Committed with `release: vX.Y.Z`
- [ ] Pushed to main
- [ ] Tag `vX.Y.Z` created and pushed
- [ ] Publish workflow succeeded
- [ ] npm shows correct version
