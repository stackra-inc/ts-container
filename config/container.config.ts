/**
 * Container Configuration
 *
 * IApplication bootstrap options for `IApplication.create()`.
 * Uses the `defineConfig` helper for type-safe configuration with
 * full IDE autocomplete.
 *
 * This file is the single place to configure:
 * - Debug mode and global window exposure
 * - Global application config (injected as `'APP_CONFIG'` everywhere)
 * - The `onReady` callback for post-bootstrap logic
 *
 * ## Usage
 *
 * ```typescript
 * // main.ts
 * import 'reflect-metadata';
 * import { IApplication } from '@stackra/ts-container';
 * import containerConfig from './config/container.config';
 * import { AppModule } from './app.module';
 *
 * const app = await IApplication.create(AppModule, containerConfig);
 * ```
 *
 * ## Environment Variables
 *
 * | Variable                  | Description                              | Default        |
 * |---------------------------|------------------------------------------|----------------|
 * | `VITE_API_URL`            | Base URL for API requests                | `''`           |
 * | `VITE_APP_ENV`            | IApplication environment                  | `'development'`|
 * | `VITE_FF_NEW_CHECKOUT`    | Feature flag — new checkout flow         | `'false'`      |
 * | `VITE_FF_NEW_UI`          | Feature flag — new UI components         | `'false'`      |
 * | `VITE_APP_GLOBAL_NAME`    | Window property name for debug access    | `'__APP__'`    |
 *
 * @module config/container
 */

import { defineConfig, IApplicationContext } from "@stackra/ts-container";
import { Logger } from "@stackra/ts-logger";
import { Env, env } from "@stackra/ts-support";

/**
 * ILogger instance for the container.config context.
 */
const logger = new Logger("container.config");

/**
 * IApplication container configuration.
 *
 * Passed directly to `IApplication.create(AppModule, containerConfig)`.
 * All fields are optional — sensible defaults are applied automatically.
 */
const containerConfig = defineConfig({
  /**
   * Expose the application instance on `window` for browser devtools.
   *
   * When `true`, `window[globalName]` is set after bootstrap so you can
   * inspect the container from the browser console:
   *   `window.__APP__.get(UserService)`
   *
   * Auto-detected from `env('NODE_ENV')` — enabled in development,
   * disabled in production builds automatically.
   */
  debug: env("NODE_ENV", "production") !== "production",

  /**
   * The global window property name for debug access.
   *
   * Only used when `debug` is `true`.
   *
   * @default '__APP__'
   */
  globalName: env("VITE_APP_GLOBAL_NAME", "__APP__"),

  /**
   * Register `beforeunload` / `SIGTERM` shutdown hooks automatically.
   * Triggers `onModuleDestroy` and `onApplicationShutdown` on all providers.
   */
  shutdownHooks: true,

  /**
   * DI resolution logging — prints the full dependency graph during bootstrap.
   *
   * Shows: modules → providers → scopes → dependencies → lifecycle hooks → timing.
   * Disable in production for performance.
   */
  logging: {
    enabled: Env.boolean("CONTAINER_LOGGING", true),
    resolution: true,
    lifecycle: true,
    timing: true,
    graph: true,
    colors: true,
  },

  /**
   * Called after the application is fully bootstrapped.
   *
   * All providers are resolved and all `onModuleInit()` hooks have
   * completed by the time this runs. Use for:
   * - Startup logging
   * - Analytics tracking
   * - Feature flag evaluation
   * - Any async setup that needs the full DI graph
   *
   * @param app - The bootstrapped IApplication instance
   */
  onReady: async (_app: IApplicationContext) => {
    if (env("NODE_ENV", "production") !== "production") {
      logger.info("[Container] IApplication bootstrapped ✅");
    }
  },
});

export default containerConfig;
