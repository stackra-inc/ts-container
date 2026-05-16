/**
 * DependenciesScanner — Module Tree Scanner
 *
 * The scanner is the first phase of the DI bootstrap. It walks the module
 * graph starting from the root module and:
 *
 * 1. Registers each module in the container
 * 2. Registers each module's providers
 * 3. Sets up import relationships between modules
 * 4. Sets up export declarations
 * 5. Links global modules to all other modules
 *
 * After scanning, the container has a complete picture of the module graph
 * but NO instances have been created yet. That's the injector's job.
 *
 * ## Scan algorithm:
 *
 * ```
 * scan(RootModule)
 *   → scanForModules(RootModule)        // recursive DFS
 *     → addModule(RootModule)
 *     → scanForModules(ImportedModule1)  // recurse into imports
 *     → scanForModules(ImportedModule2)
 *   → scanModulesForDependencies()      // second pass
 *     → for each module:
 *       → reflectImports()
 *       → reflectProviders()
 *       → reflectExports()
 *   → bindGlobalScope()                 // link globals
 * ```
 *
 * All metadata reads go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module injector/scanner
 */

import { MODULE_METADATA } from "@/constants";
import { getMetadata } from "@vivtel/metadata";
import type { ModuleContainer } from "@/registries/container.registry";
import type { Type } from "@/types/type.type";
import type { IDynamicModule } from "@/interfaces/dynamic-module.interface";
import type { Provider } from "@/interfaces/provider.interface";
import type { ForwardReference } from "@/interfaces/forward-reference.interface";
import type { ModuleMetatype } from "@/interfaces/module-metatype.interface";

/**
 * Scans the module tree and populates the container.
 *
 * Performs a two-phase scan: first discovers all modules via DFS traversal,
 * then registers providers, imports, and exports for each discovered module.
 * Finally, links global modules to all other modules.
 *
 * @example
 * ```typescript
 * const container = new ModuleContainer();
 * const scanner = new DependenciesScanner(container);
 * await scanner.scan(AppModule);
 * // Container now has all modules, providers, imports, and exports registered
 * ```
 */
export class DependenciesScanner {
  /**
   * Create a new DependenciesScanner.
   *
   * @param container - The `ModuleContainer` to populate with modules and providers
   */
  constructor(private readonly container: ModuleContainer) {}

  /**
   * Scan the entire module tree starting from the root module.
   *
   * This is the main entry point. After this method completes,
   * the container has all modules, providers, imports, and exports
   * registered — but no instances created.
   *
   * Runs three phases:
   * 1. **Module discovery** — Recursive DFS to find all modules
   * 2. **Dependency registration** — Register providers, imports, exports per module
   * 3. **Global binding** — Link global modules to all other modules
   *
   * @param rootModule - The root module class (your AppModule)
   * @returns A Promise that resolves when scanning is complete
   *
   * @example
   * ```typescript
   * const scanner = new DependenciesScanner(container);
   * await scanner.scan(AppModule);
   * ```
   */
  public async scan(rootModule: Type<any>): Promise<void> {
    // Phase 1: Discover all modules (recursive DFS)
    await this.scanForModules(rootModule, []);

    // Phase 2: Register providers, imports, exports for each module
    await this.scanModulesForDependencies();

    // Phase 3: Link global modules to all other modules
    this.container.bindGlobalScope();
  }

  // ── Phase 1: Module discovery ────────────────────────────────────────────

  /**
   * Recursively discover and register all modules in the graph.
   *
   * Uses DFS traversal. Tracks visited modules to avoid infinite loops
   * from circular imports. Resolves forward references before processing.
   * Tracks module distance from root for lifecycle hook ordering.
   *
   * @param moduleDefinition - The module to scan (class or dynamic module)
   * @param ctxRegistry - Already-visited modules (for cycle detection)
   * @param distance - Distance from root module (0 = root, 1 = direct import, etc.)
   *
   * @throws Error if an `undefined` module is encountered in imports
   *   (usually caused by circular dependencies without `forwardRef()`)
   */
  private async scanForModules(
    moduleDefinition: ModuleMetatype,
    ctxRegistry: any[],
    distance: number = 0,
  ): Promise<void> {
    // Resolve forward references
    const resolved = this.resolveForwardRef(moduleDefinition);
    if (!resolved) return;

    // Skip if already visited (circular import protection)
    if (ctxRegistry.includes(resolved)) return;
    ctxRegistry.push(resolved);

    // Register this module in the container
    const { moduleRef } = await this.container.addModule(resolved);

    // Set module distance for lifecycle hook ordering
    moduleRef.distance = distance;

    // Get this module's imports (from both static @Module() and dynamic metadata)
    const imports = this.getModuleImports(resolved);

    // Recurse into each import with distance + 1
    for (const importedModule of imports) {
      if (importedModule === undefined || importedModule === null) {
        const moduleName = this.getModuleName(resolved);
        throw new Error(
          `An undefined module was imported by ${moduleName}. ` +
            `This is usually caused by a circular dependency. Use forwardRef() to resolve it.`,
        );
      }
      await this.scanForModules(importedModule, ctxRegistry, distance + 1);
    }
  }

  // ── Phase 2: Dependency registration ─────────────────────────────────────

  /**
   * For each registered module, read its metadata and register
   * providers, imports, and exports in the container.
   *
   * Iterates all modules in the container and calls `reflectImports()`,
   * `reflectProviders()`, and `reflectExports()` for each one.
   *
   * @returns A Promise that resolves when all dependencies are registered
   */
  private async scanModulesForDependencies(): Promise<void> {
    const modules = this.container.getModules();

    for (const [token, moduleRef] of modules) {
      // Register imports (module relationships)
      await this.reflectImports(moduleRef.metatype, token);

      // Register providers
      this.reflectProviders(moduleRef.metatype, token);

      // Register exports
      this.reflectExports(moduleRef.metatype, token);
    }
  }

  /**
   * Read and register a module's imports.
   *
   * Merges static `@Module({ imports })` metadata with dynamic module imports.
   * Resolves forward references before adding each import to the container.
   *
   * @param metatype - The module class to read import metadata from
   * @param token - The module's token in the container
   */
  private async reflectImports(metatype: Type<any>, token: string): Promise<void> {
    const staticImports = getMetadata<any[]>(MODULE_METADATA.IMPORTS, metatype) ?? [];
    const dynamicImports: any[] = this.container.getDynamicMetadata(token, "imports" as any) ?? [];

    for (const related of [...staticImports, ...dynamicImports]) {
      const resolved = this.resolveForwardRef(related);
      if (resolved) {
        this.container.addImport(resolved, token);
      }
    }
  }

  /**
   * Read and register a module's providers.
   *
   * Merges static `@Module({ providers })` metadata with dynamic module providers.
   * Each provider is added to the container under the module's token.
   *
   * @param metatype - The module class to read provider metadata from
   * @param token - The module's token in the container
   */
  private reflectProviders(metatype: Type<any>, token: string): void {
    const staticProviders = getMetadata<Provider[]>(MODULE_METADATA.PROVIDERS, metatype) ?? [];
    const dynamicProviders: Provider[] =
      this.container.getDynamicMetadata(token, "providers" as any) ?? [];

    for (const provider of [...staticProviders, ...dynamicProviders]) {
      this.container.addProvider(provider, token);
    }
  }

  /**
   * Read and register a module's exports.
   *
   * Merges static `@Module({ exports })` metadata with dynamic module exports.
   * Resolves forward references before adding each export to the container.
   * Validates that exported tokens have corresponding providers in the module.
   *
   * @param metatype - The module class to read export metadata from
   * @param token - The module's token in the container
   */
  private reflectExports(metatype: Type<any>, token: string): void {
    const staticExports = getMetadata<any[]>(MODULE_METADATA.EXPORTS, metatype) ?? [];
    const dynamicExports: any[] = this.container.getDynamicMetadata(token, "exports" as any) ?? [];

    const allExports = [...staticExports, ...dynamicExports];

    // Validate: exported tokens must have corresponding providers
    const staticProviders = getMetadata<Provider[]>(MODULE_METADATA.PROVIDERS, metatype) ?? [];
    const dynamicProviders: Provider[] =
      this.container.getDynamicMetadata(token, "providers" as any) ?? [];
    const allProviders = [...staticProviders, ...dynamicProviders];

    const providerTokens = new Set<any>();
    for (const provider of allProviders) {
      if (typeof provider === "function") {
        providerTokens.add(provider);
      } else if (provider && typeof provider === "object" && "provide" in provider) {
        providerTokens.add((provider as any).provide);
      }
    }

    for (const exported of allExports) {
      const resolved = this.resolveForwardRef(exported);
      const exportToken = this.getExportToken(resolved);

      // Skip module re-exports (classes that are modules, not providers)
      if (exportToken && typeof exportToken === "function" && !providerTokens.has(exportToken)) {
        // Check if it's a module being re-exported (has MODULE_METADATA)
        const isModule =
          getMetadata<any[]>(MODULE_METADATA.IMPORTS, exportToken) !== undefined ||
          getMetadata<any[]>(MODULE_METADATA.PROVIDERS, exportToken) !== undefined ||
          this.container.getModuleByToken(exportToken.name) !== undefined;

        if (!isModule) {
          const moduleName = this.getModuleName(metatype);
          console.warn(
            `[Container] Module '${moduleName}' exports '${this.getTokenName(exportToken)}' ` +
              `but does not provide it. Add it to the module's providers array.`,
          );
        }
      }

      this.container.addExport(resolved ?? exported, token);
    }
  }

  /**
   * Extract the token from an export declaration.
   *
   * @param exported - The export declaration
   * @returns The token, or undefined if it cannot be determined
   */
  private getExportToken(exported: any): any {
    if (!exported) return undefined;
    if (typeof exported === "function") return exported;
    if (typeof exported === "symbol" || typeof exported === "string") return exported;
    if (typeof exported === "object" && "provide" in exported) return exported.provide;
    if (typeof exported === "object" && "module" in exported) return exported.module;
    return undefined;
  }

  /**
   * Get a human-readable name from a token.
   *
   * @param token - The token to convert
   * @returns A human-readable string
   */
  private getTokenName(token: any): string {
    if (typeof token === "function") return token.name;
    if (typeof token === "symbol") return token.toString();
    return String(token);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Get a module's imports from both static and dynamic sources.
   *
   * For dynamic modules, merges the static `@Module()` imports from the
   * module class with the dynamic imports from the configuration object.
   *
   * @param moduleDefinition - The module class or dynamic module object
   * @returns An array of imported module definitions
   */
  private getModuleImports(moduleDefinition: any): any[] {
    if (this.isDynamicModule(moduleDefinition)) {
      const staticImports =
        getMetadata<any[]>(MODULE_METADATA.IMPORTS, moduleDefinition.module) ?? [];
      const dynamicImports: any[] = moduleDefinition.imports ?? [];
      return [...staticImports, ...dynamicImports];
    }

    return getMetadata<any[]>(MODULE_METADATA.IMPORTS, moduleDefinition) ?? [];
  }

  /**
   * Resolve a forward reference to its actual value.
   *
   * If the input is a `ForwardReference` object (has a `forwardRef` property),
   * calls the function to get the actual class reference. Otherwise returns
   * the input as-is.
   *
   * @param ref - The value to resolve (may or may not be a forward reference)
   * @returns The resolved value, or the original input if not a forward reference
   */
  private resolveForwardRef(ref: any): any {
    if (ref && typeof ref === "object" && "forwardRef" in ref) {
      return (ref as ForwardReference).forwardRef();
    }
    return ref;
  }

  /**
   * Check if a module definition is a dynamic module.
   *
   * Dynamic modules are objects with a `module` property that references
   * the module class, as opposed to static modules which are just class
   * constructors.
   *
   * @param module - The module definition to check
   * @returns `true` if the definition is a `IDynamicModule`
   */
  private isDynamicModule(module: any): module is IDynamicModule {
    return module && !!(module as IDynamicModule).module;
  }

  /**
   * Get a human-readable name for a module.
   *
   * Handles both dynamic modules (extracts the class name from `module`)
   * and static modules (uses the function name directly).
   *
   * @param module - The module definition to get a name for
   * @returns A human-readable module name string
   */
  private getModuleName(module: any): string {
    if (this.isDynamicModule(module)) return module.module.name;
    if (typeof module === "function") return module.name;
    return String(module);
  }
}
