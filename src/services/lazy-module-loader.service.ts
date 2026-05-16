/**
 * LazyModuleLoader — Runtime Module Loading
 *
 * Mirrors NestJS's `LazyModuleLoader` — allows loading modules after the
 * application has bootstrapped. Useful for code-split features in SPAs
 * where you don't want to pay the cost of scanning/resolving a module
 * until the user actually navigates to that feature.
 *
 * ## How it works
 *
 * 1. The module is scanned and added to the existing container
 * 2. Global modules are linked to the new module
 * 3. Providers are resolved (instances created, deps injected)
 * 4. Lifecycle hooks (`onModuleInit`, `onApplicationBootstrap`) are called
 * 5. The module reference is returned for provider access
 *
 * ## Usage
 *
 * ```typescript
 * @Injectable()
 * class FeatureLoader {
 *   constructor(private readonly lazyLoader: LazyModuleLoader) {}
 *
 *   async loadReports() {
 *     const moduleRef = await this.lazyLoader.load(() => ReportsModule);
 *     const reportsService = moduleRef.getProviderByToken(ReportsService);
 *     return reportsService?.instance;
 *   }
 * }
 * ```
 *
 * @module injector/lazy-module-loader
 */

import { Injectable } from "@/decorators/injectable.decorator";
import { ModuleContainer } from "@/registries/container.registry";
import { DependenciesScanner } from "@/services/scanner.service";
import { Injector } from "@/services/injector.service";
import type { Type } from "@/types/type.type";
import type { IDynamicModule } from "@/interfaces/dynamic-module.interface";
import type { Module } from "@/injector/module.class";

/**
 * Lazily loads modules at runtime after the application has bootstrapped.
 *
 * Injected automatically — `ApplicationFactory.create()` registers
 * `ModuleContainer` on every module, and `LazyModuleLoader` depends on it.
 * Just declare it as a constructor dependency in any `@Injectable()` class.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class PluginManager {
 *   constructor(private readonly lazyLoader: LazyModuleLoader) {}
 *
 *   async activatePlugin(pluginModule: Type<any>) {
 *     const moduleRef = await this.lazyLoader.load(() => pluginModule);
 *     const plugin = moduleRef.getProviderByToken(PluginService);
 *     plugin?.instance?.activate();
 *   }
 * }
 * ```
 */
@Injectable()
export class LazyModuleLoader {
  /**
   * Create a new LazyModuleLoader.
   *
   * @param container - The active `ModuleContainer` (auto-injected)
   */
  public constructor(private readonly container: ModuleContainer) {}

  /**
   * Load a module lazily at runtime.
   *
   * The module is scanned, its providers are resolved, and lifecycle
   * hooks are called — just like during initial bootstrap, but for a
   * single module added after the fact.
   *
   * If the module is already registered in the container (e.g., it was
   * imported statically), the existing module reference is returned
   * without re-scanning or re-resolving.
   *
   * @param moduleFactory - A factory function that returns the module class
   *   or a `IDynamicModule`. Using a factory (not a direct class reference)
   *   enables dynamic `import()` for code splitting.
   * @returns The loaded `Module` reference with all providers resolved
   *
   * @throws Error if the module cannot be scanned or resolved
   *
   * @example
   * ```typescript
   * // Static class reference
   * const moduleRef = await lazyLoader.load(() => ReportsModule);
   *
   * // Dynamic import (code-split)
   * const moduleRef = await lazyLoader.load(
   *   async () => (await import('./reports/reports.module')).ReportsModule
   * );
   *
   * // Dynamic module (forFeature pattern)
   * const moduleRef = await lazyLoader.load(() =>
   *   CacheModule.forFeature({ store: 'redis' })
   * );
   * ```
   */
  public async load(
    moduleFactory: () => Type<any> | IDynamicModule | Promise<Type<any> | IDynamicModule>,
  ): Promise<Module> {
    // Resolve the factory (supports async for dynamic imports)
    const moduleDefinition = await moduleFactory();

    // Extract the class to check if already registered
    const moduleClass = this.extractModuleClass(moduleDefinition);
    const existingModule = this.container.getModuleByToken(moduleClass.name);

    // If already registered, return the existing reference
    if (existingModule) {
      return existingModule;
    }

    // Capture existing module tokens before scanning
    const existingModuleTokens = new Set(this.container.getModules().keys());

    // Scan the new module into the container
    const scanner = new DependenciesScanner(this.container);
    await scanner.scan(moduleClass);

    // Link global modules to the newly added module
    this.container.bindGlobalScope();

    // Resolve providers in the new module
    const newModuleRef = this.container.getModuleByToken(moduleClass.name);
    if (!newModuleRef) {
      throw new Error(
        `LazyModuleLoader: Module '${moduleClass.name}' was not registered after scanning. ` +
          "This is an internal error — please report it.",
      );
    }

    // Only resolve and run lifecycle hooks on newly added modules
    const injector = new Injector();
    const newModules: Module[] = [];

    for (const [token, moduleRef] of this.container.getModules()) {
      if (!existingModuleTokens.has(token)) {
        newModules.push(moduleRef);
      }
    }

    // Sort new modules by distance for correct lifecycle order
    newModules.sort((a, b) => a.distance - b.distance);

    // Phase 1: Resolve providers in new modules only
    for (const moduleRef of newModules) {
      await injector.resolveProviders(moduleRef);
    }

    // Phase 2: Call onModuleInit() on new module providers only
    for (const moduleRef of newModules) {
      for (const [, wrapper] of moduleRef.providers) {
        if (
          wrapper.isResolved &&
          wrapper.instance &&
          typeof (wrapper.instance as any).onModuleInit === "function"
        ) {
          await (wrapper.instance as any).onModuleInit();
        }
      }
    }

    // Phase 3: Call onApplicationBootstrap() on new module providers only
    for (const moduleRef of newModules) {
      for (const [, wrapper] of moduleRef.providers) {
        if (
          wrapper.isResolved &&
          wrapper.instance &&
          typeof (wrapper.instance as any).onApplicationBootstrap === "function"
        ) {
          await (wrapper.instance as any).onApplicationBootstrap();
        }
      }
    }

    return newModuleRef;
  }

  /**
   * Extract the module class from a definition (class or IDynamicModule).
   *
   * @param definition - The module class or dynamic module object
   * @returns The module class constructor
   */
  private extractModuleClass(definition: Type<any> | IDynamicModule): Type<any> {
    if (typeof definition === "function") {
      return definition;
    }
    return (definition as IDynamicModule).module;
  }
}
