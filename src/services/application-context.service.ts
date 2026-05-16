/**
 * ApplicationContext — The Bootstrapped DI Container
 *
 * Mirrors NestJS's `NestApplicationContext` — the runtime representation
 * of a fully bootstrapped module graph with all providers resolved and
 * lifecycle hooks executed.
 *
 * This is a 100% client-side implementation. No HTTP adapter, no
 * microservices, no request-scoped resolution. The context provides:
 *
 * - `get(token)` — resolve any provider by token
 * - `getOptional(token)` — resolve or return `undefined`
 * - `has(token)` — check if a provider exists
 * - `select(Module)` — scope resolution to a specific module
 * - `getModuleRef(Module)` — get a module reference for dynamic instantiation
 * - `getContainer()` — access the raw `ModuleContainer`
 * - `close(signal?)` — graceful shutdown with lifecycle hooks
 * - `enableShutdownHooks()` — register platform shutdown listeners
 * - `init()` — manually trigger initialization (called automatically by factory)
 *
 * ## Usage
 *
 * ```typescript
 * import { ApplicationFactory } from '@stackra/ts-container';
 *
 * const app = await ApplicationFactory.create(AppModule);
 * const userService = app.get(UserService);
 * await app.close();
 * ```
 *
 * @module application/application-context
 */

import { ModuleContainer } from "@/registries/container.registry";
import { InstanceLoader } from "@/services/instance-loader.service";
import { tokenName } from "@/utils/token-name.util";
import type { ContainerLogger } from "@/services/container-logger.service";
import type { Type } from "@/types/type.type";
import type { Module } from "@/injector/module.class";
import type { IDynamicModule } from "@/interfaces/dynamic-module.interface";
import type { InjectionToken } from "@/interfaces/injection-token.interface";
import type { IApplicationContext } from "@/interfaces/application-context.interface";
import { WithEnvironment } from "@/mixins";

/**
 * The bootstrapped application context.
 *
 * Provides access to the DI container after all modules have been
 * scanned and all providers have been instantiated. Implements
 * `IApplicationContext` (which extends `ContainerResolver`) so it can
 * be used directly with `<ContainerProvider context={app}>` from
 * `@stackra/ts-container/react`.
 *
 * Instances are created exclusively via `ApplicationFactory.create()` or
 * `ApplicationFactory.builder(...).boot()`. The constructor is public
 * (for testability) but not intended for direct use.
 *
 * @example
 * ```typescript
 * const app = await ApplicationFactory.create(AppModule);
 * const userService = app.get(UserService);
 * await app.close();
 * ```
 */
/**
 * Base class for the environment mixin.
 * @internal
 */
class ApplicationContextBase {}

/**
 * ApplicationContext with environment helpers mixed in.
 */
export class ApplicationContext
  extends WithEnvironment(ApplicationContextBase)
  implements IApplicationContext
{
  /**
   * The underlying container holding all modules and provider bindings.
   * Populated by the `DependenciesScanner` during the scan phase.
   */
  private readonly container: ModuleContainer;

  /**
   * The instance loader that orchestrates provider instantiation
   * and lifecycle hooks. Created once and reused for the lifetime
   * of the application.
   */
  private readonly instanceLoader: InstanceLoader;

  /**
   * Whether the application has been fully bootstrapped and is ready
   * to use. Set to `true` after `init()` completes, `false` after
   * `close()` is called.
   */
  private isInitialized = false;

  /**
   * Whether platform shutdown hooks have been registered via
   * `enableShutdownHooks()`. Prevents double-registration.
   */
  private shutdownHooksRegistered = false;

  /**
   * Create a new ApplicationContext.
   *
   * @param container - The populated `ModuleContainer` (after scanning)
   * @param instanceLoader - The `InstanceLoader` (after resolution)
   */
  public constructor(container: ModuleContainer, instanceLoader: InstanceLoader) {
    super();
    this.container = container;
    this.instanceLoader = instanceLoader;
  }

  // ── Initialization ───────────────────────────────────────────────────────

  /**
   * Initialize the application context.
   *
   * Triggers provider instantiation and lifecycle hooks:
   * 1. Resolve all providers in all modules
   * 2. Resolve entry providers (eager initialization)
   * 3. Call `onModuleInit()` on all providers
   * 4. Call `onApplicationBootstrap()` on all providers
   *
   * Called automatically by `ApplicationFactory.create()`. You only need
   * to call this manually if you constructed the context yourself (e.g.,
   * in tests).
   *
   * @returns This `ApplicationContext` instance (for chaining)
   *
   * @example
   * ```typescript
   * const ctx = new ApplicationContext(container, loader);
   * await ctx.init();
   * ```
   */
  public async init(logger?: ContainerLogger): Promise<this> {
    if (this.isInitialized) {
      return this;
    }

    await this.instanceLoader.createInstances(logger);
    this.isInitialized = true;
    return this;
  }

  // ── Provider Resolution ──────────────────────────────────────────────────

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
   *
   * @example
   * ```typescript
   * const userService = app.get(UserService);
   * const config = app.get<CacheConfig>(CACHE_CONFIG);
   * const apiUrl = app.get<string>('API_URL');
   * ```
   */
  public get<T = any>(token: InjectionToken<T>): T {
    this.assertInitialized();

    for (const [, moduleRef] of this.container.getModules()) {
      const wrapper = moduleRef.providers.get(token);
      if (!wrapper) continue;

      // Singleton or value provider — return cached instance
      if (wrapper.isResolved && !wrapper.isTransient) {
        return wrapper.instance as T;
      }

      // Transient provider — create a fresh instance each time
      if (wrapper.isTransient && wrapper.metatype) {
        return this.instantiateTransient<T>(wrapper, moduleRef);
      }

      // Transient provider with a cached instance from initial resolution
      if (wrapper.isTransient && wrapper.instance !== null) {
        return wrapper.instance as T;
      }
    }

    throw new Error(
      `Provider '${tokenName(token)}' not found in any module. ` +
        `Make sure it is provided in a module that has been imported.`,
    );
  }

  /**
   * Try to resolve a provider, returning `undefined` if not found.
   *
   * Unlike `get()`, this method does not throw when the provider
   * is missing. Useful for optional dependencies or feature detection.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token
   * @returns The resolved instance, or `undefined` if not found
   *
   * @example
   * ```typescript
   * const analytics = app.getOptional(AnalyticsService);
   * if (analytics) {
   *   analytics.track('page_view');
   * }
   * ```
   */
  public getOptional<T = any>(token: InjectionToken<T>): T | undefined {
    try {
      return this.get(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a provider is registered in any module.
   *
   * Does not trigger resolution — only checks for the existence
   * of a binding for the given token across all modules.
   *
   * @param token - The injection token to check
   * @returns `true` if a provider is registered for this token
   *
   * @example
   * ```typescript
   * if (app.has(RedisManager)) {
   *   // Redis is available
   * }
   * ```
   */
  public has(token: InjectionToken): boolean {
    for (const [, moduleRef] of this.container.getModules()) {
      if (moduleRef.providers.has(token)) return true;
    }
    return false;
  }

  // ── Module Navigation ────────────────────────────────────────────────────

  /**
   * Select a specific module and return a scoped context.
   *
   * The returned context resolves providers only from the selected
   * module. Useful when the same token exists in multiple modules
   * and you need to specify which one to resolve from.
   *
   * @typeParam T - The module class type
   * @param module - The module class or dynamic module to select
   * @returns A scoped `IApplicationContext` for the selected module
   *
   * @throws Error if the module is not found in the container
   *
   * @example
   * ```typescript
   * const cacheCtx = app.select(CacheModule);
   * const manager = cacheCtx.get(CacheManager);
   * ```
   */
  public select<T>(module: Type<T> | IDynamicModule): IApplicationContext {
    this.assertInitialized();

    const moduleClass = this.extractModuleClass(module);

    for (const [, moduleRef] of this.container.getModules()) {
      if (moduleRef.metatype === moduleClass) {
        // Return a lightweight scoped context that only resolves from this module
        return new ScopedApplicationContext(moduleRef, this.instanceLoader);
      }
    }

    throw new Error(`Module '${moduleClass.name}' not found in the container.`);
  }

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
   *
   * @example
   * ```typescript
   * const moduleRef = app.getModuleRef(UserModule);
   * const dynamicService = moduleRef.create(DynamicService);
   * ```
   */
  public getModuleRef(moduleClass: Type<any>): Module {
    this.assertInitialized();

    for (const [, moduleRef] of this.container.getModules()) {
      if (moduleRef.metatype === moduleClass) {
        // Attach injector to module for create() method
        (moduleRef as any).__injector__ = this.instanceLoader.getInjector();
        return moduleRef;
      }
    }

    throw new Error(`Module '${moduleClass.name}' not found in the container.`);
  }

  /**
   * Get the underlying ModuleContainer.
   *
   * For advanced use cases like inspecting the module graph,
   * accessing raw InstanceWrappers, or building dev tools.
   *
   * @returns The `ModuleContainer` instance
   */
  public getContainer(): ModuleContainer {
    return this.container;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Gracefully shut down the application.
   *
   * Calls shutdown lifecycle hooks on all providers in three phases:
   * 1. `beforeApplicationShutdown(signal)` — prepare for shutdown
   * 2. `onApplicationShutdown(signal)` — main shutdown logic
   * 3. `onModuleDestroy()` — final cleanup
   *
   * Hooks are called in reverse module order (leaf modules first, root
   * module last) to ensure dependencies are still available when a
   * provider's hooks run.
   *
   * After calling `close()`, the context is no longer usable.
   *
   * @param signal - Optional shutdown signal (e.g., 'beforeunload', 'SIGTERM')
   * @returns A Promise that resolves when all shutdown hooks have completed
   *
   * @example
   * ```typescript
   * await app.close();
   * ```
   */
  public async close(signal?: string): Promise<void> {
    await this.instanceLoader.destroy(signal);
    this.isInitialized = false;
  }

  /**
   * Register platform-appropriate shutdown hooks.
   *
   * - Browser: `window.addEventListener('beforeunload', ...)`
   * - Node (SSR/tests): `process.on('SIGTERM', ...)` + `process.on('SIGINT', ...)`
   *
   * When triggered, calls `this.close(signal)` which runs all shutdown
   * lifecycle hooks on providers.
   *
   * Safe to call multiple times — only registers once.
   *
   * @returns This `ApplicationContext` instance (for chaining)
   *
   * @example
   * ```typescript
   * const app = await ApplicationFactory.create(AppModule);
   * app.enableShutdownHooks();
   * ```
   */
  public enableShutdownHooks(): this {
    if (this.shutdownHooksRegistered) {
      return this;
    }
    this.shutdownHooksRegistered = true;

    if (typeof window !== "undefined") {
      // Browser environment — use beforeunload
      window.addEventListener("beforeunload", () => {
        void this.close("beforeunload");
      });
    } else if (typeof process !== "undefined") {
      // Node environment (SSR, tests) — use POSIX signals
      const handler = (signal: string) => {
        void this.close(signal);
      };
      process.on("SIGTERM", () => handler("SIGTERM"));
      process.on("SIGINT", () => handler("SIGINT"));
    }

    return this;
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Assert that the application has been initialized.
   *
   * @throws Error if `init()` hasn't been called or `close()` was called
   */
  private assertInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "ApplicationContext is not initialized. " +
          "Call ApplicationFactory.create() or context.init() first.",
      );
    }
  }

  /**
   * Extract the module class from a `Type` or `IDynamicModule`.
   *
   * @param module - The module class or dynamic module object
   * @returns The module class constructor
   */
  private extractModuleClass(module: Type<any> | IDynamicModule): Type<any> {
    if (typeof module === "function") {
      return module;
    }
    return (module as IDynamicModule).module;
  }

  /**
   * Synchronously instantiate a transient provider.
   *
   * After bootstrap, all dependencies of a transient provider are already
   * resolved singletons. So we can synchronously look them up and call
   * `new Class(...deps)` without awaiting anything.
   *
   * @typeParam T - The type of the transient instance
   * @param wrapper - The InstanceWrapper for the transient provider
   * @param moduleRef - The module context for dependency lookup
   * @returns A new instance of the transient provider
   */
  private instantiateTransient<T>(wrapper: any, moduleRef: Module): T {
    const injector = this.instanceLoader.getInjector();
    const metatype = wrapper.metatype;

    // Read constructor dependencies from metadata
    const deps = (injector as any).getConstructorDependencies(metatype);
    const optionalIndices: number[] = (injector as any).getOptionalDependencies(metatype);

    // Resolve each dependency synchronously (all singletons are already cached)
    const resolvedDeps = deps.map((dep: InjectionToken, index: number) => {
      if (dep === undefined || dep === null || dep === Object) {
        if (optionalIndices.includes(index)) return undefined;
        return undefined;
      }

      const result = injector.lookupProvider(dep, moduleRef);
      if (!result) {
        if (optionalIndices.includes(index)) return undefined;
        throw new Error(
          `Cannot resolve transient dependency '${tokenName(dep)}' ` +
            `for provider '${tokenName(wrapper.token)}'.`,
        );
      }

      return result.wrapper.instance;
    });

    return new metatype(...resolvedDeps);
  }
}

// ── Scoped Context (internal) ──────────────────────────────────────────────

/**
 * A lightweight scoped context returned by `ApplicationContext.select()`.
 *
 * Resolves providers only from the selected module. Implements the same
 * `IApplicationContext` interface but scoped to a single module.
 *
 * @internal
 */
class ScopedApplicationContextBase {}

/**
 * @internal
 */
class ScopedApplicationContext
  extends WithEnvironment(ScopedApplicationContextBase)
  implements IApplicationContext
{
  /**
   * The module this context is scoped to.
   */
  private readonly moduleRef: Module;

  /**
   * The instance loader for transient resolution.
   */
  private readonly instanceLoader: InstanceLoader;

  /**
   * @param moduleRef - The module to scope resolution to
   * @param instanceLoader - The instance loader for transient providers
   */
  public constructor(moduleRef: Module, instanceLoader: InstanceLoader) {
    super();
    this.moduleRef = moduleRef;
    this.instanceLoader = instanceLoader;
  }

  /**
   * Resolve a provider from the scoped module only.
   *
   * @typeParam T - The expected type
   * @param token - The injection token
   * @returns The resolved instance
   * @throws Error if not found in this module
   */
  public get<T = any>(token: InjectionToken<T>): T {
    const wrapper = this.moduleRef.providers.get(token);
    if (!wrapper) {
      throw new Error(
        `Provider '${tokenName(token)}' not found in module '${this.moduleRef.name}'.`,
      );
    }
    if (wrapper.isResolved) {
      return wrapper.instance as T;
    }
    throw new Error(
      `Provider '${tokenName(token)}' in module '${this.moduleRef.name}' is not resolved.`,
    );
  }

  /**
   * Try to resolve a provider from the scoped module.
   *
   * @typeParam T - The expected type
   * @param token - The injection token
   * @returns The resolved instance or `undefined`
   */
  public getOptional<T = any>(token: InjectionToken<T>): T | undefined {
    try {
      return this.get(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a provider exists in the scoped module.
   *
   * @param token - The injection token
   * @returns `true` if the provider exists
   */
  public has(token: InjectionToken): boolean {
    return this.moduleRef.providers.has(token);
  }

  /**
   * Select is a no-op on a scoped context — returns itself.
   *
   * @returns This scoped context
   */
  public select(): IApplicationContext {
    return this;
  }

  /**
   * Get the module reference.
   *
   * @param _moduleClass - Ignored (already scoped)
   * @returns The scoped module
   */
  public getModuleRef(_moduleClass: Type<any>): Module {
    (this.moduleRef as any).__injector__ = this.instanceLoader.getInjector();
    return this.moduleRef;
  }

  /**
   * Not supported on scoped context.
   *
   * @throws Error always
   */
  public getContainer(): ModuleContainer {
    throw new Error("getContainer() is not available on a scoped context. Use the root context.");
  }

  /**
   * Not supported on scoped context.
   *
   * @throws Error always
   */
  public async init(): Promise<this> {
    return this;
  }

  /**
   * Not supported on scoped context.
   *
   * @throws Error always
   */
  public async close(): Promise<void> {
    throw new Error("close() is not available on a scoped context. Use the root context.");
  }

  /**
   * Not supported on scoped context.
   *
   * @returns this
   */
  public enableShutdownHooks(): this {
    return this;
  }
}
