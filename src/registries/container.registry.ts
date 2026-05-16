/**
 * ModuleContainer — Top-Level Module Registry
 *
 * This is the central registry of the DI system. It holds:
 * - All registered modules (keyed by opaque token)
 * - The set of global modules
 * - Dynamic module metadata
 *
 * ## How the container is used:
 *
 * ```
 * Scanner
 *   ├── addModule()       → registers each module
 *   ├── addProvider()     → populates module providers
 *   ├── addImport()       → links module relationships
 *   ├── addExport()       → declares module exports
 *   └── bindGlobalScope() → links global modules to all others
 *
 * Injector
 *   └── reads from modules to resolve dependencies
 * ```
 *
 * The container itself does NOT resolve dependencies — that's the injector's job.
 * The container is purely a data structure that holds the module graph.
 *
 * @module injector/container
 */

import "reflect-metadata";
import { getMetadata } from "@vivtel/metadata";

import { Module } from "@/injector/module.class";
import { GLOBAL_MODULE_METADATA } from "@/constants";
import { DiscoverableMetaHostCollection } from "@/registries/discoverable-meta-host-collection.registry";
import type { Type } from "@/types/type.type";
import type { Provider } from "@/interfaces/provider.interface";
import type { IDynamicModule } from "@/interfaces/dynamic-module.interface";
import type { InjectionToken } from "@/interfaces/injection-token.interface";
import type { ModuleMetatype } from "@/interfaces/module-metatype.interface";

/**
 * The top-level DI container.
 *
 * Holds all modules and their provider bindings. Created once during
 * application bootstrap and shared throughout the application lifetime.
 * The scanner populates it, and the injector reads from it.
 *
 * @example
 * ```typescript
 * const container = new ModuleContainer();
 * const scanner = new DependenciesScanner(container);
 * await scanner.scan(AppModule);
 *
 * const loader = new InstanceLoader(container);
 * await loader.createInstances();
 * ```
 */
export class ModuleContainer {
  /**
   * All registered modules, keyed by their opaque token.
   * The token is derived from the module class name (or a hash for dynamic modules).
   */
  private readonly modules = new Map<string, Module>();

  /**
   * Global modules whose exports are available to all other modules.
   * Populated during `addModule()` when a module has `@Global()` or `global: true`.
   */
  private readonly globalModules = new Set<Module>();

  /**
   * Dynamic module metadata, keyed by module token.
   * Stored separately because dynamic metadata is merged with static `@Module()` metadata
   * during the scanner's dependency registration phase.
   */
  private readonly dynamicModulesMetadata = new Map<string, Partial<IDynamicModule>>();

  // ── Module registration ──────────────────────────────────────────────────

  /**
   * Add a module to the container.
   *
   * If the module is already registered (by token), returns the existing one.
   * Otherwise, creates a new `Module` instance, registers it, and checks
   * whether it should be added to the global modules set.
   *
   * Handles async dynamic modules by awaiting the promise before extraction.
   *
   * @param metatype - The module class, dynamic module object, or promise of a dynamic module
   * @returns An object containing the `moduleRef` and whether it was newly `inserted`
   *
   * @example
   * ```typescript
   * const { moduleRef, inserted } = await container.addModule(UserModule);
   * if (inserted) {
   *   logger.info(`Registered new module: ${moduleRef.name}`);
   * }
   * ```
   */
  public async addModule(
    metatype: ModuleMetatype,
  ): Promise<{ moduleRef: Module; inserted: boolean }> {
    // Resolve promises (for async dynamic modules)
    const resolved = metatype instanceof Promise ? await metatype : metatype;

    // Extract the class and dynamic metadata
    const { type, dynamicMetadata, token } = this.extractModuleMetadata(resolved);

    // Check if already registered
    if (this.modules.has(token)) {
      const existingModule = this.modules.get(token)!;

      // If this is a dynamic module with new providers/exports (e.g. forFeature()),
      // merge them into the existing module's dynamic metadata.
      // This handles the pattern where forRoot() and forFeature() both return
      // DynamicModules with the same module class.
      if (dynamicMetadata) {
        const existing = this.dynamicModulesMetadata.get(token);
        if (existing) {
          // Merge providers
          if (dynamicMetadata.providers) {
            existing.providers = [...(existing.providers ?? []), ...dynamicMetadata.providers];
          }
          // Merge exports
          if (dynamicMetadata.exports) {
            existing.exports = [...(existing.exports ?? []), ...dynamicMetadata.exports];
          }
          // Merge imports
          if (dynamicMetadata.imports) {
            existing.imports = [...(existing.imports ?? []), ...dynamicMetadata.imports];
          }
        } else {
          this.dynamicModulesMetadata.set(token, dynamicMetadata);
        }
      }

      return { moduleRef: existingModule, inserted: false };
    }

    // Create and register the module
    const moduleRef = new Module(type);
    moduleRef.token = token;
    this.modules.set(token, moduleRef);

    // IStore dynamic metadata for later merging
    if (dynamicMetadata) {
      this.dynamicModulesMetadata.set(token, dynamicMetadata);
    }

    // Check if this is a global module
    if (this.isGlobalModule(type, dynamicMetadata)) {
      moduleRef.isGlobal = true;
      this.globalModules.add(moduleRef);
    }

    return { moduleRef, inserted: true };
  }

  // ── Provider, Import, Export registration ────────────────────────────────

  /**
   * Add a provider to a module.
   *
   * Delegates to the module's `addProvider()` method, which handles
   * all provider forms (class shorthand, class, value, factory, existing).
   *
   * @param provider - The provider to add (any valid provider form)
   * @param token - The module token to add the provider to
   *
   * @throws Error if the module token is not found in the container
   *
   * @example
   * ```typescript
   * container.addProvider(UserService, 'UserModule');
   * container.addProvider({ provide: 'API_URL', useValue: 'https://...' }, 'AppModule');
   * ```
   */
  public addProvider(provider: Provider, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) {
      throw new Error(`Module [${token}] not found in container.`);
    }
    const providerToken = moduleRef.addProvider(provider);

    // Index discoverable providers so DiscoveryService can find them in O(1).
    // No-op when the provider's class wasn't decorated with a discoverable
    // decorator (the common case).
    const wrapper = moduleRef.providers.get(providerToken);
    if (wrapper) {
      DiscoverableMetaHostCollection.inspectProvider(this, wrapper);
    }
  }

  /**
   * Add an import relationship between modules.
   *
   * Looks up the related module by its token and adds it to the
   * importing module's imports set. If either module is not found,
   * the operation is silently skipped.
   *
   * @param relatedModule - The module being imported (class or dynamic module)
   * @param token - The token of the module doing the importing
   *
   * @example
   * ```typescript
   * container.addImport(ConfigModule, 'UserModule');
   * ```
   */
  public addImport(relatedModule: Type<any> | IDynamicModule, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) return;

    const { token: relatedToken } = this.extractModuleMetadata(relatedModule);
    const related = this.modules.get(relatedToken);
    if (related) {
      moduleRef.addImport(related);
    }
  }

  /**
   * Add an export to a module.
   *
   * Handles three export forms:
   * - Dynamic modules — exports the module class
   * - Custom providers — exports the provider's token
   * - Direct tokens — exports the token as-is (class, string, symbol)
   *
   * @param toExport - The token, provider, or dynamic module to export
   * @param token - The module token
   *
   * @example
   * ```typescript
   * container.addExport(UserService, 'UserModule');
   * container.addExport({ provide: CACHE, useExisting: CacheManager }, 'CacheModule');
   * ```
   */
  public addExport(toExport: InjectionToken | Provider | IDynamicModule, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) return;

    if (typeof toExport === "object" && toExport !== null && "module" in toExport) {
      // Exporting a dynamic module — export the module class
      moduleRef.addExport((toExport as IDynamicModule).module);
    } else if (typeof toExport === "object" && toExport !== null && "provide" in toExport) {
      // Exporting a custom provider — export its token
      moduleRef.addExport((toExport as any).provide);
    } else {
      // Exporting a token directly (class, string, symbol)
      moduleRef.addExport(toExport as InjectionToken);
    }
  }

  // ── Global scope binding ─────────────────────────────────────────────────

  /**
   * Link all global modules to all non-global modules as imports.
   *
   * Called after all modules have been scanned. This makes global modules'
   * exports available everywhere without explicit imports. Each non-global
   * module gets every global module added to its imports set.
   *
   * @example
   * ```typescript
   * // After scanning all modules:
   * container.bindGlobalScope();
   * // Now ConfigModule's exports are available in every module
   * ```
   */
  public bindGlobalScope(): void {
    for (const moduleRef of this.modules.values()) {
      for (const globalModule of this.globalModules) {
        if (moduleRef !== globalModule) {
          moduleRef.addImport(globalModule);
        }
      }
    }
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  /**
   * Get all registered modules.
   *
   * Returns the internal modules map. Used by the injector and instance
   * loader to iterate over all modules during resolution and lifecycle hooks.
   *
   * @returns A `Map` of module tokens to `Module` instances
   */
  public getModules(): Map<string, Module> {
    return this.modules;
  }

  /**
   * Get a module by its token.
   *
   * @param token - The opaque module token (typically the class name)
   * @returns The `Module` instance, or `undefined` if not found
   */
  public getModuleByToken(token: string): Module | undefined {
    return this.modules.get(token);
  }

  /**
   * Get dynamic metadata for a module.
   *
   * Supports two call signatures:
   * - Without `key`: returns the full dynamic metadata object
   * - With `key`: returns a specific metadata property (e.g., 'imports', 'providers')
   *
   * Returns an empty array for missing keys (not `undefined`) to simplify
   * caller code that spreads the result.
   *
   * @param token - The module token
   * @param key - Optional specific key to retrieve (e.g., 'imports', 'providers')
   * @returns The full metadata object, a specific property value, or `undefined`/`[]`
   *
   * @example
   * ```typescript
   * const meta = container.getDynamicMetadata('CacheModule');
   * const providers = container.getDynamicMetadata('CacheModule', 'providers');
   * ```
   */
  public getDynamicMetadata(token: string): Partial<IDynamicModule> | undefined;
  public getDynamicMetadata<K extends keyof IDynamicModule>(
    token: string,
    key: K,
  ): IDynamicModule[K] | undefined;
  public getDynamicMetadata(token: string, key?: string): any {
    const metadata = this.dynamicModulesMetadata.get(token);
    if (!metadata) return key ? [] : undefined;
    return key ? ((metadata as any)[key] ?? []) : metadata;
  }

  /**
   * Clear all modules, global modules, and dynamic metadata.
   *
   * Resets the container to its initial empty state. Primarily used
   * in tests to ensure a clean slate between test cases.
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   container.clear();
   * });
   * ```
   */
  public clear(): void {
    this.modules.clear();
    this.globalModules.clear();
    this.dynamicModulesMetadata.clear();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Extract the module class, dynamic metadata, and token from a module definition.
   *
   * Handles both static modules (just a class) and dynamic modules
   * (objects with a `module` property). The token is derived from the
   * class name.
   *
   * @param metatype - The module class or dynamic module object
   * @returns An object with `type` (class), `dynamicMetadata`, and `token`
   */
  private extractModuleMetadata(metatype: Type<any> | IDynamicModule): {
    type: Type<any>;
    dynamicMetadata: Partial<IDynamicModule> | undefined;
    token: string;
  } {
    if (this.isDynamicModule(metatype)) {
      const { module: type, ...dynamicMetadata } = metatype as IDynamicModule;
      return {
        type,
        dynamicMetadata,
        token: type.name,
      };
    }

    return {
      type: metatype as Type<any>,
      dynamicMetadata: undefined,
      token: (metatype as Type<any>).name,
    };
  }

  /**
   * Check if a module definition is a dynamic module (has a `module` property).
   *
   * @param metatype - The module definition to check
   * @returns `true` if the definition is a `IDynamicModule`
   */
  private isDynamicModule(metatype: any): metatype is IDynamicModule {
    return metatype && !!(metatype as IDynamicModule).module;
  }

  /**
   * Check if a module should be registered as global.
   *
   * A module is global if:
   * - It has the `@Global()` decorator (sets `__module:global__` metadata), OR
   * - Its dynamic metadata has `global: true`
   *
   * @param type - The module class to check for `@Global()` metadata
   * @param dynamicMetadata - Optional dynamic metadata to check for `global: true`
   * @returns `true` if the module should be global
   */
  private isGlobalModule(type: Type<any>, dynamicMetadata?: Partial<IDynamicModule>): boolean {
    if (dynamicMetadata?.global) return true;
    return !!getMetadata<boolean>(GLOBAL_MODULE_METADATA, type);
  }
}
