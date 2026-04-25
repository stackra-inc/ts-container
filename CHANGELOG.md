# @stackra/ts-container

## 2.0.10 — 2026-04-25

### Fixed

- 🔧 **`Type<T>` interface fix** — changed constructor signature from
  `new (...args: unknown[]): T` to `new (...args: any[]): T` to match NestJS's
  `Type<T>` definition. The `unknown[]` constraint was too strict for a DI
  container — TypeScript's contravariant parameter checking prevented classes
  with typed constructor params (e.g., `constructor(config: RealtimeConfig)`)
  from satisfying `Type<T>`, breaking class providers and module exports

---

## 2.0.9 — 2026-04-24

### Fixed

- 📝 **tsup.config.ts comment fix** — corrected build output filenames in JSDoc
  (`index.mjs` → `index.js` for ESM, `index.js` → `index.cjs` for CJS) to match
  actual tsup output when `"type": "module"` is set

---

## 2.0.8 — 2026-04-20

### Changed

- 🏢 **Org rename** — migrated from `@stakraco` → `@stackra` across package
  name, repository URLs, README, examples, workflows, and steering docs
- 🔧 **CI simplification** — streamlined CI workflow
- 📝 **Steering & docs** — updated product, structure, and tech steering files

---

## 2.0.7 — 2026-04-18

### Improvements

- 🖼️ **Banner in Slack notification** — the package banner image now appears at
  the top of the Slack release announcement
- 💬 **Slack mrkdwn conversion** — changelog content is now converted from
  GitHub-flavored markdown to Slack-compatible mrkdwn (`###` → `*bold*`,
  `**text**` → `*text*`, `- ` → `• `)
- 🔧 **SVG-to-PNG Kiro hook** — added a local hook that auto-regenerates
  `banner.png` from `banner.svg` whenever the SVG is edited
- 📏 **Steering files** — added workspace-level steering docs for tech stack,
  project structure, and product overview

---

## 2.0.6 — 2026-04-18

### Improvements

- 💬 **Rich Slack release notifications** — redesigned the publish workflow's
  Slack message with full Block Kit layout: release notes from CHANGELOG.md,
  release type badge (stable / pre-release), commit count since last tag, action
  buttons (npm, GitHub Release, Full Changelog, Workflow Run), and a context
  footer with actor, commit SHA, and compare link. Failure notifications now
  include View Logs and Re-run buttons.

### Fixes

- 🔗 **Fix GitHub org URL** — corrected `stackra-incco` → `stackra-inc` in all
  example READMEs and the publish workflow (release notes link, Slack
  notification link)
- 📝 **Changelog wording** — minor copy fix in the v2.0.4 changelog entry

---

## 2.0.4 — 2026-04-18

### Fixes

- 🔗 **Correct repository URL** — `package.json` and `README.md` now point to
  `github.com/stackra-inc/ts-container` (was `stackra-inc`); this was causing
  npm provenance verification to fail on publish

---

## 2.0.3 — 2026-04-18

### Documentation & Assets

- 🎨 **Banner & logo** — added `.github/assets/banner.svg` and
  `.github/assets/logo.svg` with the package visual identity
- 📝 **README rewrite** — banner at top, updated badges, nav links, consistent
  formatting throughout
- 📚 **Example READMEs** — all four example READMEs (root, basic-di,
  dynamic-modules, react-integration) updated with banner, badges, and
  related-examples links

### Internal

- 🔧 **File rename** — `global-application.ts` → `global.application.ts` for
  naming consistency
- 🔧 **Import ordering** — normalised import order across `src/index.ts`,
  `src/application/`, and `src/injector/` (no API changes)

---

## 2.0.2 — 2026-04-18

### Fixes

- 📝 **README** — full documentation rewrite with badges, all API references,
  React integration guide, lifecycle hooks, advanced features, and tsconfig
  requirements

---

## 2.0.1 — 2026-04-18

### Fixes & Improvements

- ♻️ **Rename `NestContainer` → `ModuleContainer`** — removes the NestJS
  internal naming from the public API
- 🔧 **Standalone ESLint config** — replaced shared monorepo config with a
  self-contained `typescript-eslint` setup; no more `eslint-plugin-turbo`
  dependency
- 🔒 **`import type` consistency** — all type-only imports now use `import type`
  across the injector and application layers
- � **`@ts-ignore` → `@ts-expect-error`** — virtual module imports in
  `RegistryScanner` now use the safer directive
- � **`Function` type removed** — replaced with explicit call signatures
  (`(...args: unknown[]) => unknown`) in `InjectionToken`, `Type`,
  `InstanceWrapper`, and all decorators
- � **`pnpm-lock.yaml` added** — standalone lockfile for reproducible CI
  installs outside the monorepo
- � **`.prettierignore`** — excludes `pnpm-lock.yaml` and `dist/` from
  formatting checks

### Breaking Changes

- `NestContainer` is renamed to `ModuleContainer`. Update any direct imports:
  ```typescript
  // Before
  import { NestContainer } from '@stackra/ts-container';
  // After
  import { ModuleContainer } from '@stackra/ts-container';
  ```

---

## 2.0.0 — 2026-04-18

### New Features

- 📏 **Module Distance Tracking** — lifecycle hooks now run in predictable
  breadth-first order (root → children → grandchildren); shutdown runs in
  reverse order (leaf → root)
- 🏗️ **`ModuleRef.create()`** — dynamically instantiate classes outside the
  normal DI flow via `app.getModuleRef(Module).create(Service)`
- 🚀 **Entry Providers** — `entryProviders` field in `@Module()` for eager
  initialization of providers that need to run side effects on startup
- ⚙️ **Application Config** — pass `config` to `Application.create()` and it is
  automatically registered as a global `'APP_CONFIG'` value provider
- 🔄 **Additional Lifecycle Hooks** — `OnApplicationBootstrap`,
  `OnApplicationShutdown`, `BeforeApplicationShutdown` with full signal support
- 🌍 **Global Application Singleton** — `ContainerProvider` works without a
  `context` prop; `Application.create()` registers the app globally
  automatically
- 🛡️ **Type Guard Exports** — `hasOnModuleInit` and `hasOnModuleDestroy`
  exported for library authors
- 🔬 **`@vivtel/metadata` integration** — all internal `Reflect.*` calls
  replaced with typed `defineMetadata`, `getMetadata`, `updateMetadata`,
  `getAllMetadata`, and `hasOwnMetadata` from `@vivtel/metadata`
- 📁 **Separated interface files** — every exported interface, enum, and type
  alias lives in its own `*.interface.ts` / `*.enum.ts` file
- 🏷️ **`RegistryModuleMetadata` & `RegistryProviderMetadata`** — new interfaces
  for compile-time registry entries used by `RegistryScanner`

### Lifecycle Order

**Bootstrap:**

1. All providers instantiated
2. Entry providers resolved
3. `onModuleInit()` — breadth-first by module distance
4. `onApplicationBootstrap()` — breadth-first by module distance

**Shutdown (`app.close(signal?)`):**

1. `beforeApplicationShutdown(signal)` — reverse module order
2. `onApplicationShutdown(signal)` — reverse module order
3. `onModuleDestroy()` — reverse module order

### Breaking Changes

None. All changes are fully backward compatible.

---

## 1.0.0

### Major Features

- 🎉 Initial release of @stackra/ts-container
- 💉 `@Injectable()` decorator with scope support (Singleton, Transient)
- 🎯 `@Inject(token)` for explicit token-based constructor injection
- ❓ `@Optional()` for optional dependency injection
- 📦 `@Module()` decorator for module metadata declaration
- 🌐 `@Global()` decorator for global module registration
- 🔧 `DynamicModule` interface for `forRoot()` / `forFeature()` pattern
- 🏗️ `ModuleContainer` — core container managing module registry
- 🔍 `DependenciesScanner` — walks module tree, resolves imports/exports
- 🔄 `InstanceLoader` — creates provider instances, calls lifecycle hooks
- 🔗 `Injector` — resolves constructor dependencies across module boundaries
- 📦 `InstanceWrapper` — tracks provider state (resolved, transient, instance)
- 🔗 `forwardRef()` utility for circular dependency resolution
- 🎭 Four provider types: `ClassProvider`, `ValueProvider`, `FactoryProvider`,
  `ExistingProvider`
- 🔄 Lifecycle hooks: `OnModuleInit`, `OnModuleDestroy`
- 🏷️ Metadata constants exported for library authors
