/**
 * ApplicationContextOptions Interface
 *
 * Configuration options for `ApplicationFactory.create()`. Mirrors NestJS's
 * `NestApplicationContextOptions` but tailored for 100% client-side use —
 * no HTTP adapter, no CORS, no body parser, no HTTPS options.
 *
 * All options are optional — calling `ApplicationFactory.create(AppModule)`
 * with no options works out of the box with sensible defaults.
 *
 * @module interfaces/application-context-options
 */

import { IApplicationContext } from "./application-context.interface";

/**
 * Options for bootstrapping an `ApplicationContext`.
 *
 * @example
 * ```typescript
 * import { ApplicationFactory } from '@stackra/ts-container';
 *
 * const app = await ApplicationFactory.create(AppModule, {
 *   snapshot: true,
 *   globalName: '__POS__',
 *   shutdownHooks: true,
 * });
 * ```
 */
export interface ApplicationContextOptions {
  /**
   * Buffer logs until a custom logger is attached via `app.useLogger()`.
   *
   * When `true`, log messages emitted during bootstrap are buffered in
   * memory and flushed once a logger is set. Useful when the logger
   * itself is a DI-managed provider that isn't available until after
   * bootstrap completes.
   *
   * @default false
   */
  bufferLogs?: boolean;

  /**
   * Automatically flush buffered logs after bootstrap completes.
   *
   * Only relevant when `bufferLogs` is `true`. When `autoFlushLogs`
   * is `true`, buffered messages are flushed immediately after all
   * lifecycle hooks have run.
   *
   * @default true
   */
  autoFlushLogs?: boolean;

  /**
   * Enable snapshot mode for the module graph inspector.
   *
   * When `true`, the container records a deterministic graph of all
   * modules, providers, and their relationships. Useful for devtools,
   * visualization, and debugging.
   *
   * @default false
   */
  snapshot?: boolean;

  /**
   * Enable preview mode — modules are scanned but providers are NOT
   * instantiated.
   *
   * Useful for graph visualization, static analysis, and build-time
   * tooling that needs to inspect the module tree without side effects.
   *
   * @default false
   */
  preview?: boolean;

  /**
   * Expose the application on `window[globalName]` for browser console
   * debugging.
   *
   * When `true`, the `ApplicationContext` instance is assigned to
   * `window[globalName]` after bootstrap completes. Defaults to `true`
   * in development (`NODE_ENV !== 'production'`), `false` in production.
   *
   * @default undefined (auto-detected from environment)
   */
  debug?: boolean;

  /**
   * The global variable name to expose the application on.
   *
   * Only used when `debug` is enabled (explicitly or auto-detected).
   *
   * @default '__APP__'
   */
  globalName?: string;

  /**
   * Automatically register shutdown hooks on the platform.
   *
   * - Browser: `window.addEventListener('beforeunload', ...)`
   * - Node (SSR/tests): `process.on('SIGTERM', ...)` + `process.on('SIGINT', ...)`
   *
   * When enabled, `app.close()` is called automatically on shutdown,
   * triggering `beforeApplicationShutdown`, `onApplicationShutdown`,
   * and `onModuleDestroy` lifecycle hooks on all providers.
   *
   * @default true
   */
  shutdownHooks?: boolean;

  /**
   * Global application configuration object.
   *
   * Automatically registered as a value provider with the token
   * `'APP_CONFIG'` and made available to all modules (the root module
   * is marked global when config is provided).
   *
   * Use for centralized app-wide settings like API URLs, feature flags,
   * environment variables, etc.
   *
   * @example
   * ```typescript
   * const app = await ApplicationFactory.create(AppModule, {
   *   config: {
   *     apiUrl: import.meta.env.VITE_API_URL,
   *     featureFlags: { newCheckout: true },
   *   },
   * });
   *
   * // In any service:
   * @Injectable()
   * class ApiService {
   *   constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
   * }
   * ```
   */
  config?: Record<string, unknown>;

  /**
   * DI resolution logging configuration.
   *
   * When enabled, logs the full dependency graph during bootstrap:
   * modules, providers, scopes, dependencies, lifecycle hooks, and timing.
   *
   * Inspired by inversify-logger-middleware but adapted for our
   * NestJS-style container with modules and lifecycle hooks.
   *
   * @example
   * ```typescript
   * const app = await ApplicationFactory.create(AppModule, {
   *   logging: {
   *     enabled: true,
   *     resolution: true,
   *     lifecycle: true,
   *     timing: true,
   *     graph: true,
   *   },
   * });
   * ```
   *
   * @default { enabled: false }
   */
  logging?: {
    /** Enable logging entirely. */
    enabled?: boolean;
    /** Log each provider resolution. */
    resolution?: boolean;
    /** Log lifecycle hook execution. */
    lifecycle?: boolean;
    /** Include timing in milliseconds. */
    timing?: boolean;
    /** Print the full dependency graph after bootstrap. */
    graph?: boolean;
    /** Use ANSI colors in output. */
    colors?: boolean;
    /** Custom renderer function. */
    renderer?: (output: string) => void;
  };

  /**
   * Called after the application is fully bootstrapped.
   *
   * All providers are resolved and all lifecycle hooks have completed.
   * Use for startup logging, analytics, or post-bootstrap setup.
   *
   * @param app - The bootstrapped ApplicationContext instance
   */
  onReady?: (app: IApplicationContext) => void | Promise<void>;
}
