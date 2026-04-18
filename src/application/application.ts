/**
 * Application — Bootstrap Entry Point
 *
 * This is the equivalent of NestJS's `NestFactory.createApplicationContext()`.
 * It orchestrates the full bootstrap sequence:
 *
 * 1. **Scan** — Walk the module tree, register all modules/providers/imports/exports
 * 2. **Instantiate** — Resolve all providers (create instances, inject dependencies)
 * 3. **Lifecycle** — Call `onModuleInit()` on providers that implement it
 *
 * After bootstrap, the Application provides `get()` to resolve any provider.
 *
 * ## Usage:
 *
 * ```typescript
 * import { Application } from '@stackra/ts-container';
 *
 * const app = await Application.create(AppModule);
 * const userService = app.get(UserService);
 * await app.close();
 * ```
 *
 * ## With options:
 *
 * ```typescript
 * const app = await Application.create(AppModule, {
 *   debug: true,
 *   onReady: (ctx) => console.log('Ready!', ctx),
 * });
 * ```
 *
 * ## With React:
 *
 * ```tsx
 * import { ContainerProvider } from '@stackra/ts-container/react';
 *
 * const app = await Application.create(AppModule);
 *
 * ReactDOM.createRoot(root).render(
 *   <ContainerProvider context={app}>
 *     <App />
 *   </ContainerProvider>
 * );
 * ```
 *
 * @module application/application
 */

import type { Type, InjectionToken } from '@/interfaces';
import type { ApplicationOptions } from '@/interfaces/application-options.interface';
import { NestContainer } from '@/injector/container';
import { DependenciesScanner } from '@/injector/scanner';
import { InstanceLoader } from '@/injector/instance-loader';
import { Module as ModuleRef } from '@/injector/module';
import type { IApplication } from '@/interfaces/application.interface';
import { setGlobalApplication } from './global-application';

/**
 * The bootstrapped application context.
 *
 * Provides access to the DI container after all modules have been
 * scanned and all providers have been instantiated.
 *
 * Implements `IApplication` (which extends `ContainerResolver`)
 * so it can be used directly with `<ContainerProvider context={app}>`
 * from `@stackra/ts-container/react`.
 *
 * @example
 * ```typescript
 * const app = await Application.create(AppModule);
 * const userService = app.get(UserService);
 * await app.close();
 * ```
 */
export class Application implements IApplication {
  /**
   * The underlying container holding all modules and provider bindings.
   */
  private readonly container: NestContainer;

  /**
   * The instance loader that orchestrates provider instantiation
   * and lifecycle hooks.
   */
  private readonly instanceLoader: InstanceLoader;

  /**
   * Whether the application has been fully bootstrapped and is ready to use.
   * Set to `false` after `close()` is called.
   */
  private isInitialized = false;

  /**
   * Private constructor — use `Application.create()` instead.
   *
   * @param container - The populated container
   * @param instanceLoader - The loader with resolved providers
   */
  private constructor(container: NestContainer, instanceLoader: InstanceLoader) {
    this.container = container;
    this.instanceLoader = instanceLoader;
  }

  // ── Static factory ───────────────────────────────────────────────────────

  /**
   * Create and bootstrap an application context.
   *
   * This is the single entry point for the entire DI system. It:
   * 1. Scans the module tree starting from the root module
   * 2. Resolves all providers (creates instances, injects dependencies)
   * 3. Resolves entry providers (eager initialization)
   * 4. Calls `onModuleInit()` lifecycle hooks
   * 5. Calls `onApplicationBootstrap()` lifecycle hooks
   * 6. Registers global APP_CONFIG provider if config is provided
   * 7. Optionally exposes the app on `window` for debugging
   * 8. Optionally calls the `onReady` callback
   *
   * @param rootModule - The root module class (your AppModule)
   * @param options - Optional configuration for debug mode, config, and lifecycle callbacks
   * @returns A fully bootstrapped Application
   *
   * @example
   * ```typescript
   * // Simple usage
   * const app = await Application.create(AppModule);
   *
   * // With options
   * const app = await Application.create(AppModule, {
   *   debug: true,
   *   globalName: '__MY_APP__',
   *   config: {
   *     apiUrl: 'https://api.example.com',
   *     featureFlags: { newUI: true },
   *   },
   *   onReady: (ctx) => console.log('Bootstrapped!', ctx),
   * });
   * ```
   */
  public static async create(
    rootModule: Type<any>,
    options: ApplicationOptions = {}
  ): Promise<Application> {
    const container = new NestContainer();
    const scanner = new DependenciesScanner(container);
    const instanceLoader = new InstanceLoader(container);

    // Phase 1: Scan the module tree
    await scanner.scan(rootModule);

    // Phase 1.5: Register global APP_CONFIG if provided
    if (options.config) {
      // Find the root module and add APP_CONFIG as a global provider
      const rootModuleRef = container.getModuleByToken(rootModule.name);
      if (rootModuleRef) {
        container.addProvider(
          { provide: 'APP_CONFIG', useValue: options.config },
          rootModuleRef.token
        );
        // Export it so it's available everywhere
        container.addExport('APP_CONFIG', rootModuleRef.token);
        // Make root module global if config is provided
        rootModuleRef.isGlobal = true;
      }
    }

    // Phase 2: Create all provider instances
    await instanceLoader.createInstances();

    const app = new Application(container, instanceLoader);
    app.isInitialized = true;

    // Register as global application
    setGlobalApplication(app);

    // Phase 3: Debug — expose on window for browser console access
    const { debug, globalName = '__APP__', onReady } = options;
    const isDev =
      debug ?? (typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true);

    if (isDev && typeof window !== 'undefined') {
      (window as any)[globalName] = app;
    }

    // Phase 4: onReady callback
    if (onReady) {
      await onReady(app);
    }

    return app;
  }

  // ── ContainerResolver interface ──────────────────────────────────────────

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
      `Provider '${this.getTokenName(token)}' not found in any module. ` +
        `Make sure it is provided in a module that has been imported.`
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

  // ── Advanced API ─────────────────────────────────────────────────────────

  /**
   * Select a specific module and resolve a provider from it.
   *
   * Useful when the same token exists in multiple modules and you
   * need to specify which one to resolve from.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param moduleClass - The module class to search in
   * @param token - The injection token
   * @returns The resolved provider instance
   *
   * @throws Error if the module or provider is not found
   *
   * @example
   * ```typescript
   * const cache = app.select(CacheModule, CacheManager);
   * ```
   */
  public select<T = any>(moduleClass: Type<any>, token: InjectionToken<T>): T {
    this.assertInitialized();

    for (const [, moduleRef] of this.container.getModules()) {
      if (moduleRef.metatype === moduleClass) {
        const wrapper = moduleRef.providers.get(token);
        if (wrapper?.isResolved) {
          return wrapper.instance as T;
        }
        throw new Error(
          `Provider '${this.getTokenName(token)}' not found in module '${moduleClass.name}'.`
        );
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
   * const dynamicService = moduleRef.create(DynamicService, [customArg]);
   * ```
   */
  public getModuleRef(moduleClass: Type<any>): ModuleRef {
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
   * Get the underlying NestContainer.
   *
   * For advanced use cases like inspecting the module graph,
   * accessing raw InstanceWrappers, or building dev tools.
   *
   * @returns The `NestContainer` instance
   */
  public getContainer(): NestContainer {
    return this.container;
  }

  /**
   * Gracefully shut down the application.
   *
   * Calls shutdown lifecycle hooks on all providers in three phases:
   * 1. `beforeApplicationShutdown(signal)` — prepare for shutdown
   * 2. `onApplicationShutdown(signal)` — main shutdown logic
   * 3. `onModuleDestroy()` — final cleanup
   *
   * Hooks are called in reverse module order (leaf modules first, root module last)
   * to ensure dependencies are still available when a provider's hooks run.
   *
   * After calling `close()`, the context is no longer usable.
   *
   * @param signal - Optional shutdown signal (e.g., 'SIGTERM', 'SIGINT')
   * @returns A Promise that resolves when all shutdown hooks have completed
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * await app.close();
   *
   * // With signal
   * window.addEventListener('beforeunload', () => {
   *   app.close('SIGTERM');
   * });
   * ```
   */
  public async close(signal?: string): Promise<void> {
    await this.instanceLoader.destroy(signal);
    this.isInitialized = false;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Assert that the application has been initialized.
   *
   * @throws Error if `create()` hasn't been called or `close()` was called
   */
  private assertInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Application is not initialized. Call Application.create() first.');
    }
  }

  /**
   * Get a human-readable name from an injection token.
   *
   * @param token - The injection token to convert
   * @returns A human-readable string representation
   */
  private getTokenName(token: InjectionToken): string {
    if (typeof token === 'function') return token.name;
    if (typeof token === 'symbol') return token.toString();
    return String(token);
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
  private instantiateTransient<T>(wrapper: any, moduleRef: ModuleRef): T {
    const injector = this.instanceLoader.getInjector();

    const metatype = wrapper.metatype;
    const deps = (injector as any).getConstructorDependencies(metatype);
    const optionalIndices: number[] = (injector as any).getOptionalDependencies(metatype);

    const resolvedDeps = deps.map((dep: InjectionToken, index: number) => {
      if (dep === undefined || dep === null || dep === Object) {
        if (optionalIndices.includes(index)) return undefined;
        return undefined;
      }

      const result = injector.lookupProvider(dep, moduleRef);
      if (!result) {
        if (optionalIndices.includes(index)) return undefined;
        throw new Error(`Cannot resolve transient dependency '${this.getTokenName(dep)}'`);
      }

      return result.wrapper.instance;
    });

    return new metatype(...resolvedDeps);
  }
}
