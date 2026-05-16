/**
 * InstanceLoader — Provider Instantiation & Lifecycle Orchestrator
 *
 * After the scanner has built the module graph, the InstanceLoader:
 * 1. Resolves all providers in all modules (via the Injector)
 * 2. Resolves entry providers (eager initialization)
 * 3. Calls `onModuleInit()` on providers that implement it
 * 4. Calls `onApplicationBootstrap()` on providers that implement it
 *
 * It also provides `destroy()` for calling shutdown lifecycle hooks.
 *
 * ## Bootstrap flow:
 *
 * ```
 * InstanceLoader.createInstances()
 *   ├── Phase 1: Resolve all providers (Injector.resolveProviders)
 *   ├── Phase 2: Resolve entry providers (eager initialization)
 *   ├── Phase 3: Call onModuleInit() lifecycle hooks (breadth-first)
 *   └── Phase 4: Call onApplicationBootstrap() lifecycle hooks (breadth-first)
 *
 * InstanceLoader.destroy(signal?)
 *   ├── Phase 1: Call beforeApplicationShutdown(signal) (reverse order)
 *   ├── Phase 2: Call onApplicationShutdown(signal) (reverse order)
 *   └── Phase 3: Call onModuleDestroy() (reverse order)
 * ```
 *
 * @module injector/instance-loader
 */

import { getMetadata } from "@vivtel/metadata";

import { Injector } from "@/services/injector.service";
import type { Module } from "@/injector/module.class";
import type { Provider } from "@/interfaces/provider.interface";
import { MODULE_METADATA } from "@/constants";
import type { ModuleContainer } from "@/registries/container.registry";
import type { ContainerLogger } from "@/services/container-logger.service";
import { hasOnModuleInit } from "@/utils/has-on-module-init.util";
import { hasOnModuleDestroy } from "@/utils/has-on-module-destroy.util";
import type { OnApplicationShutdown } from "@/interfaces/on-application-shutdown.interface";
import type { IOnApplicationBootstrap } from "@/interfaces/on-application-bootstrap.interface";
import type { BeforeApplicationShutdown } from "@/interfaces/before-application-shutdown.interface";

/**
 * Type guard for IOnApplicationBootstrap interface.
 */
function hasOnApplicationBootstrap(instance: any): instance is IOnApplicationBootstrap {
  return instance && typeof instance.onApplicationBootstrap === "function";
}

/**
 * Type guard for BeforeApplicationShutdown interface.
 */
function hasBeforeApplicationShutdown(instance: any): instance is BeforeApplicationShutdown {
  return instance && typeof instance.beforeApplicationShutdown === "function";
}

/**
 * Type guard for OnApplicationShutdown interface.
 */
function hasOnApplicationShutdown(instance: any): instance is OnApplicationShutdown {
  return instance && typeof instance.onApplicationShutdown === "function";
}

/**
 * Loads (instantiates) all providers and runs lifecycle hooks.
 *
 * Created with a reference to the `ModuleContainer` and internally creates
 * an `Injector` for dependency resolution. Orchestrates the two-phase
 * bootstrap (resolve → init hooks) and the shutdown sequence.
 *
 * @example
 * ```typescript
 * const container = new ModuleContainer();
 * const scanner = new DependenciesScanner(container);
 * await scanner.scan(AppModule);
 *
 * const loader = new InstanceLoader(container);
 * await loader.createInstances();
 *
 * // During shutdown:
 * await loader.destroy();
 * ```
 */
export class InstanceLoader {
  /**
   * The injector used for resolving provider dependencies.
   * Created once in the constructor and reused for all modules.
   */
  private readonly injector: Injector;

  /**
   * Create a new InstanceLoader.
   *
   * @param container - The `ModuleContainer` holding all registered modules
   *   and their provider bindings
   */
  constructor(private readonly container: ModuleContainer) {
    this.injector = new Injector();
  }

  /**
   * Instantiate all providers in all modules.
   *
   * Runs in four phases:
   * 1. **Resolution** — Iterates all modules and resolves each module's
   *    providers via the injector. Dependencies are resolved recursively.
   * 2. **Entry providers** — Force-resolves entry providers for eager initialization.
   * 3. **Module init hooks** — Calls `onModuleInit()` on all providers (breadth-first).
   * 4. **Application bootstrap hooks** — Calls `onApplicationBootstrap()` on all providers.
   *
   * Modules are processed in breadth-first order (sorted by distance from root)
   * to ensure lifecycle hooks run in predictable order.
   *
   * @returns A Promise that resolves when all providers are instantiated
   *   and all lifecycle hooks have completed
   *
   * @example
   * ```typescript
   * const loader = new InstanceLoader(container);
   * await loader.createInstances();
   * // All providers are now ready to use
   * ```
   */
  public async createInstances(logger?: ContainerLogger): Promise<void> {
    const modules = [...this.container.getModules().values()].sort(
      (a, b) => a.distance - b.distance,
    ); // Sort by distance for breadth-first

    // Phase 1: Resolve all providers
    for (const moduleRef of modules) {
      await this.injector.resolveProviders(moduleRef);

      // Log resolutions for this module
      if (logger?.enabled) {
        for (const [providerToken, wrapper] of moduleRef.providers) {
          const name =
            typeof providerToken === "function" ? providerToken.name : String(providerToken);
          logger.logResolution({
            name,
            module: moduleRef.token,
            scope: "singleton",
            dependencies: [],
            success: wrapper.isResolved,
          });
        }
      }
    }

    // Phase 2: Resolve entry providers (eager initialization)
    for (const moduleRef of modules) {
      await this.resolveEntryProviders(moduleRef);
    }

    // Phase 3: Call onModuleInit() lifecycle hooks
    for (const moduleRef of modules) {
      await this.callModuleInitHooks(moduleRef, logger);
    }

    // Phase 4: Call onApplicationBootstrap() lifecycle hooks
    for (const moduleRef of modules) {
      await this.callApplicationBootstrapHooks(moduleRef, logger);
    }
  }

  /**
   * Call shutdown lifecycle hooks on all providers.
   *
   * Called during application shutdown. Runs in three phases:
   * 1. **Before shutdown** — Calls `beforeApplicationShutdown(signal)` on all providers
   * 2. **Application shutdown** — Calls `onApplicationShutdown(signal)` on all providers
   * 3. **Module destroy** — Calls `onModuleDestroy()` on all providers
   *
   * Iterates modules in reverse order (leaf modules first, root module last)
   * to ensure dependencies are still available when a provider's hooks run.
   *
   * @param signal - Optional shutdown signal (e.g., 'SIGTERM', 'SIGINT')
   * @returns A Promise that resolves when all shutdown hooks have completed
   *
   * @example
   * ```typescript
   * // During application shutdown:
   * await loader.destroy('SIGTERM');
   * ```
   */
  public async destroy(signal?: string): Promise<void> {
    const modules = [...this.container.getModules().values()].sort(
      (a, b) => b.distance - a.distance,
    ); // Reverse order (leaf → root)

    // Phase 1: beforeApplicationShutdown
    for (const moduleRef of modules) {
      await this.callBeforeApplicationShutdownHooks(moduleRef, signal);
    }

    // Phase 2: onApplicationShutdown
    for (const moduleRef of modules) {
      await this.callApplicationShutdownHooks(moduleRef, signal);
    }

    // Phase 3: onModuleDestroy
    for (const moduleRef of modules) {
      await this.callModuleDestroyHooks(moduleRef);
    }
  }

  /**
   * Get the injector instance.
   *
   * Provides access to the internal injector for direct resolution
   * outside the normal module system (e.g., in the `ApplicationContext`).
   *
   * @returns The `Injector` instance used by this loader
   *
   * @example
   * ```typescript
   * const injector = loader.getInjector();
   * const result = injector.lookupProvider(UserService, moduleRef);
   * ```
   */
  public getInjector(): Injector {
    return this.injector;
  }

  // ── Private: Lifecycle hooks ─────────────────────────────────────────────

  /**
   * Resolve entry providers for eager initialization.
   *
   * Entry providers are instantiated immediately even if not injected anywhere.
   * Useful for providers that need to run side effects on startup.
   *
   * @param moduleRef - The module whose entry providers to resolve
   */
  private async resolveEntryProviders(moduleRef: Module): Promise<void> {
    const entryProviders = this.getEntryProviders(moduleRef);

    for (const provider of entryProviders) {
      const token = this.getProviderToken(provider);
      const wrapper = moduleRef.providers.get(token);

      if (wrapper && !wrapper.isResolved) {
        await this.injector.resolveInstance(wrapper, moduleRef);
      }
    }
  }

  /**
   * Get entry providers from a module's metadata.
   *
   * Merges static `@Module({ entryProviders })` with dynamic module entry providers.
   *
   * @param moduleRef - The module to get entry providers from
   * @returns Array of entry provider definitions
   */
  private getEntryProviders(moduleRef: Module): Provider[] {
    const staticEntry: Provider[] =
      getMetadata<Provider[]>(MODULE_METADATA.ENTRY_PROVIDERS, moduleRef.metatype) ?? [];
    const dynamicEntry: Provider[] =
      this.container.getDynamicMetadata(moduleRef.token, "entryProviders" as any) ?? [];

    return [...staticEntry, ...dynamicEntry];
  }

  /**
   * Extract the injection token from a provider definition.
   *
   * @param provider - The provider definition
   * @returns The injection token
   */
  private getProviderToken(provider: Provider): any {
    if (typeof provider === "function") {
      return provider;
    }
    if (typeof provider === "object" && provider !== null && "provide" in provider) {
      return (provider as any).provide;
    }
    return provider;
  }

  /**
   * Call `onModuleInit()` on all resolved providers in a module.
   *
   * Iterates the module's providers and calls `onModuleInit()` on each
   * resolved instance that implements the `OnModuleInit` interface.
   * Async hooks are awaited before proceeding to the next provider.
   *
   * @param moduleRef - The module whose providers to initialize
   */
  private async callModuleInitHooks(moduleRef: Module, logger?: ContainerLogger): Promise<void> {
    for (const [, wrapper] of moduleRef.providers) {
      if (wrapper.isResolved && wrapper.instance && hasOnModuleInit(wrapper.instance)) {
        const name = wrapper.metatype?.name ?? wrapper.token?.toString() ?? "unknown";
        const start = logger?.enabled ? performance.now() : 0;

        try {
          await wrapper.instance.onModuleInit();
          if (logger?.enabled) {
            logger.logLifecycle({
              provider: name,
              hook: "onModuleInit",
              time: performance.now() - start,
              success: true,
            });
          }
        } catch (error: any) {
          if (logger?.enabled) {
            logger.logLifecycle({
              provider: name,
              hook: "onModuleInit",
              time: performance.now() - start,
              success: false,
              error: error?.message ?? String(error),
            });
          }
          throw error;
        }
      }
    }
  }

  /**
   * Call `onApplicationBootstrap()` on all resolved providers in a module.
   *
   * Called after all `onModuleInit()` hooks have completed.
   *
   * @param moduleRef - The module whose providers to bootstrap
   */
  private async callApplicationBootstrapHooks(
    moduleRef: Module,
    logger?: ContainerLogger,
  ): Promise<void> {
    for (const [, wrapper] of moduleRef.providers) {
      if (wrapper.isResolved && wrapper.instance && hasOnApplicationBootstrap(wrapper.instance)) {
        const name = wrapper.metatype?.name ?? wrapper.token?.toString() ?? "unknown";
        const start = logger?.enabled ? performance.now() : 0;

        try {
          await wrapper.instance.onApplicationBootstrap();
          if (logger?.enabled) {
            logger.logLifecycle({
              provider: name,
              hook: "onApplicationBootstrap",
              time: performance.now() - start,
              success: true,
            });
          }
        } catch (error: any) {
          if (logger?.enabled) {
            logger.logLifecycle({
              provider: name,
              hook: "onApplicationBootstrap",
              time: performance.now() - start,
              success: false,
              error: error?.message ?? String(error),
            });
          }
          throw error;
        }
      }
    }
  }

  /**
   * Call `beforeApplicationShutdown()` on all resolved providers in a module.
   *
   * First shutdown phase — called before main shutdown logic.
   *
   * @param moduleRef - The module whose providers to prepare for shutdown
   * @param signal - Optional shutdown signal
   */
  private async callBeforeApplicationShutdownHooks(
    moduleRef: Module,
    signal?: string,
  ): Promise<void> {
    for (const [, wrapper] of moduleRef.providers) {
      if (
        wrapper.isResolved &&
        wrapper.instance &&
        hasBeforeApplicationShutdown(wrapper.instance)
      ) {
        await wrapper.instance.beforeApplicationShutdown(signal);
      }
    }
  }

  /**
   * Call `onApplicationShutdown()` on all resolved providers in a module.
   *
   * Second shutdown phase — main shutdown logic.
   *
   * @param moduleRef - The module whose providers to shut down
   * @param signal - Optional shutdown signal
   */
  private async callApplicationShutdownHooks(moduleRef: Module, signal?: string): Promise<void> {
    for (const [, wrapper] of moduleRef.providers) {
      if (wrapper.isResolved && wrapper.instance && hasOnApplicationShutdown(wrapper.instance)) {
        await wrapper.instance.onApplicationShutdown(signal);
      }
    }
  }

  /**
   * Call `onModuleDestroy()` on all resolved providers in a module.
   *
   * Third shutdown phase — final cleanup.
   *
   * @param moduleRef - The module whose providers to destroy
   */
  private async callModuleDestroyHooks(moduleRef: Module): Promise<void> {
    for (const [, wrapper] of moduleRef.providers) {
      if (wrapper.isResolved && wrapper.instance && hasOnModuleDestroy(wrapper.instance)) {
        await wrapper.instance.onModuleDestroy();
      }
    }
  }
}
