/**
 * IApplicationContext Interface
 *
 * Public contract for the bootstrapped application context. Mirrors NestJS's
 * `INestApplicationContext` but tailored for client-side use — no HTTP
 * adapter, no microservices, no request-scoped resolution.
 *
 * Extends `ContainerResolver` so any code that only needs `get()`,
 * `getOptional()`, and `has()` can depend on the lighter interface.
 *
 * @module interfaces/application-context
 */

import type { Type } from "@/types/type.type";
import type { IDynamicModule } from "./dynamic-module.interface";
import type { InjectionToken } from "./injection-token.interface";
import type { ContainerResolver } from "./container-resolver.interface";
import type { ModuleContainer } from "@/registries/container.registry";
import type { Module } from "@/injector/module.class";

/**
 * The public API of a bootstrapped application context.
 *
 * Extends `ContainerResolver` with module selection, container access,
 * lifecycle management, and graceful shutdown.
 *
 * @example
 * ```typescript
 * let app: IApplicationContext;
 *
 * beforeAll(async () => {
 *   app = await ApplicationFactory.create(AppModule);
 * });
 *
 * afterAll(async () => {
 *   await app.close();
 * });
 *
 * test('resolves UserService', () => {
 *   const userService = app.get(UserService);
 *   expect(userService).toBeDefined();
 * });
 * ```
 */
export interface IApplicationContext extends ContainerResolver {
  // ── Environment ─────────────────────────────────────────────────────────

  /**
   * Current environment name (e.g., "production", "development", "staging").
   * Reads from `APP_ENV` or `NODE_ENV`. Defaults to `"production"`.
   */
  readonly environment: string;

  /**
   * Whether the app is running in production.
   */
  readonly isProduction: boolean;

  /**
   * Whether the app is running in development/local.
   */
  readonly isDevelopment: boolean;

  /**
   * Whether the app is running in a testing environment.
   */
  readonly isTesting: boolean;

  /**
   * Whether the app is running in staging.
   */
  readonly isStaging: boolean;

  /**
   * Whether debug mode is enabled.
   */
  readonly isDebug: boolean;

  /**
   * Check if the current environment matches a given name.
   *
   * @param name - Environment name to check (case-insensitive)
   * @returns `true` if the current environment matches
   */
  isEnvironment(name: string): boolean;

  // ── Module Selection ────────────────────────────────────────────────────
  // ── Module Selection ────────────────────────────────────────────────────

  /**
   * Allows navigating through the modules tree to pull out a specific
   * instance from the selected module.
   *
   * @typeParam T - The module class type
   * @param module - The module class or dynamic module to select
   * @returns A scoped `IApplicationContext` for the selected module
   *
   * @example
   * ```typescript
   * const cacheCtx = app.select(CacheModule);
   * const manager = cacheCtx.get(CacheManager);
   * ```
   */
  select<T>(module: Type<T> | IDynamicModule): IApplicationContext;

  /**
   * Resolve a provider by its injection token.
   *
   * Searches all modules for the provider. For singleton providers,
   * returns the cached instance. For transient providers, creates
   * a fresh instance on each call.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token (class, string, or symbol)
   * @returns The resolved provider instance
   *
   * @throws Error if the provider is not found in any module
   * @throws Error if the application is not initialized
   */
  get<T = any>(token: InjectionToken<T>): T;

  /**
   * Try to resolve a provider, returning `undefined` if not found.
   *
   * Unlike `get()`, this method does not throw when the provider
   * is missing. Useful for optional dependencies or feature detection.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token
   * @returns The resolved instance, or `undefined` if not found
   */
  getOptional<T = any>(token: InjectionToken<T>): T | undefined;

  /**
   * Check if a provider is registered in any module.
   *
   * Does not trigger resolution — only checks for the existence
   * of a binding for the given token across all modules.
   *
   * @param token - The injection token to check
   * @returns `true` if a provider is registered for this token
   */
  has(token: InjectionToken): boolean;

  /**
   * Get a ModuleRef for a specific module.
   *
   * The ModuleRef provides access to the module's providers and allows
   * dynamic instantiation via `moduleRef.create()`.
   *
   * @param moduleClass - The module class to get a reference for
   * @returns The Module instance with injector access
   *
   * @throws Error if the module is not found
   */
  getModuleRef(moduleClass: Type<any>): Module;

  /**
   * Get the underlying ModuleContainer.
   *
   * For advanced use cases like inspecting the module graph,
   * accessing raw InstanceWrappers, or building dev tools.
   *
   * @returns The `ModuleContainer` instance
   */
  getContainer(): ModuleContainer;

  /**
   * Initializes the application.
   *
   * Calls the lifecycle events (`onModuleInit`, `onApplicationBootstrap`).
   * It isn't mandatory to call this method directly — `ApplicationFactory.create()`
   * calls it automatically.
   *
   * @returns The ApplicationContext instance as Promise
   */
  init(): Promise<this>;

  /**
   * Gracefully shut down the application.
   *
   * Calls shutdown lifecycle hooks on all providers in three phases:
   * 1. `beforeApplicationShutdown(signal)` — prepare for shutdown
   * 2. `onApplicationShutdown(signal)` — main shutdown logic
   * 3. `onModuleDestroy()` — final cleanup
   *
   * After calling `close()`, the context is no longer usable.
   *
   * @param signal - Optional shutdown signal (e.g., 'beforeunload')
   * @returns A Promise that resolves when all shutdown hooks have completed
   */
  close(signal?: string): Promise<void>;

  /**
   * Register shutdown hooks on the platform.
   *
   * - Browser: `window.addEventListener('beforeunload', ...)`
   * - Node: `process.on('SIGTERM', ...)` + `process.on('SIGINT', ...)`
   *
   * @returns The ApplicationContext instance for chaining
   */
  enableShutdownHooks(): this;
}
