/**
 * Injector — Dependency Resolution Engine
 *
 * The injector is the engine that turns the module graph (built by the scanner)
 * into actual, live instances. For each provider, it:
 *
 * 1. Reads constructor parameter types from metadata
 * 2. Resolves each dependency (recursively)
 * 3. Creates the instance (via `new` for classes, or by calling the factory)
 * 4. Applies property injection
 * 5. Marks the provider as resolved
 *
 * ## Resolution algorithm:
 *
 * For a given token in a given module:
 * 1. Look in the module's own providers
 * 2. If not found, look in imported modules' exports (breadth-first)
 * 3. If still not found, throw an error
 *
 * ## Singleton vs Transient:
 *
 * - Singleton (DEFAULT): resolved once, cached in the InstanceWrapper
 * - Transient: a new instance is created every time it's injected
 *
 * All metadata reads go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module injector/injector
 */

import { getMetadata, getAllMetadata, hasOwnMetadata } from "@vivtel/metadata";

import {
  PARAMTYPES_METADATA,
  OPTIONAL_DEPS_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
} from "@/constants";
import type { Module } from "@/injector/module.class";
import type { Type } from "@/types/type.type";
import type { InjectionToken } from "@/interfaces/injection-token.interface";
import type { InstanceWrapper } from "@/injector/instance-wrapper.class";

/**
 * Resolves and instantiates providers within the module graph.
 *
 * The injector is stateless — all state lives in the `InstanceWrapper`s within
 * modules. The injector reads metadata, resolves dependencies, creates instances,
 * and stores them back on the wrappers.
 *
 * @example
 * ```typescript
 * const injector = new Injector();
 * await injector.resolveProviders(moduleRef);
 *
 * // Or resolve a single provider:
 * const instance = await injector.resolveInstance(wrapper, moduleRef);
 * ```
 */
export class Injector {
  /**
   * Tracks which tokens are currently being resolved, to detect circular dependencies.
   * If a token appears in the stack while being resolved, a circular dependency error is thrown.
   */
  private readonly resolutionStack = new Set<InjectionToken>();

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Resolve all providers in a module.
   *
   * Iterates over all providers in the module and resolves each one
   * that hasn't been resolved yet. Value providers are already resolved
   * at registration time and are skipped.
   *
   * @param moduleRef - The module whose providers to resolve
   * @returns A Promise that resolves when all providers are instantiated
   *
   * @example
   * ```typescript
   * const injector = new Injector();
   * for (const [, moduleRef] of container.getModules()) {
   *   await injector.resolveProviders(moduleRef);
   * }
   * ```
   */
  public async resolveProviders(moduleRef: Module): Promise<void> {
    const providers = moduleRef.providers;

    for (const [_token, wrapper] of providers) {
      if (!wrapper.isResolved) {
        await this.resolveInstance(wrapper, moduleRef);
      }
    }
  }

  /**
   * Resolve a single provider instance.
   *
   * This is the core resolution method. It handles:
   * - Already-resolved singletons (returns cached instance)
   * - Circular dependency detection (throws with resolution chain)
   * - Factory providers (resolves inject deps, calls the factory)
   * - Class providers (resolves constructor deps, calls `new`)
   * - Property injection (after construction)
   * - Async factories (awaits the result)
   *
   * After resolution, the instance is cached on the wrapper and
   * `isResolved` is set to `true`.
   *
   * @typeParam T - The type of the provider instance
   * @param wrapper - The `InstanceWrapper` to resolve
   * @param moduleRef - The module context for dependency lookup
   * @returns The resolved provider instance
   *
   * @throws Error if a circular dependency is detected
   *
   * @example
   * ```typescript
   * const wrapper = moduleRef.getProviderByToken(UserService);
   * const instance = await injector.resolveInstance(wrapper, moduleRef);
   * ```
   */
  public async resolveInstance<T>(wrapper: InstanceWrapper<T>, moduleRef: Module): Promise<T> {
    // Already resolved singleton — return cached instance
    if (wrapper.isResolved && !wrapper.isTransient) {
      return wrapper.instance!;
    }

    // Circular dependency detection
    if (this.resolutionStack.has(wrapper.token)) {
      throw new Error(`Circular dependency detected: ${this.formatResolutionStack(wrapper.token)}`);
    }

    this.resolutionStack.add(wrapper.token);

    try {
      let instance: T;

      if (wrapper.isFactory) {
        // ── Factory provider ─────────────────────────────────────────
        instance = await this.resolveFactory(wrapper, moduleRef);
      } else if (wrapper.metatype) {
        // ── Class provider ───────────────────────────────────────────
        instance = await this.resolveClass(wrapper, moduleRef);
      } else {
        // ── Value provider (should already be resolved) ──────────────
        instance = wrapper.instance!;
      }

      // Cache the instance on the wrapper
      wrapper.instance = instance;
      wrapper.isResolved = true;

      return instance;
    } finally {
      this.resolutionStack.delete(wrapper.token);
    }
  }

  /**
   * Look up a provider by token, searching the module and its imports.
   *
   * Resolution order:
   * 1. The module's own providers
   * 2. Imported modules' exported providers (breadth-first)
   *
   * @param token - The injection token to look up
   * @param moduleRef - The module context to search from
   * @returns The `InstanceWrapper` and the module it was found in, or `undefined`
   *
   * @example
   * ```typescript
   * const result = injector.lookupProvider(UserService, moduleRef);
   * if (result) {
   *   const { wrapper, host } = result;
   *   const instance = await injector.resolveInstance(wrapper, host);
   * }
   * ```
   */
  public lookupProvider(
    token: InjectionToken,
    moduleRef: Module,
  ): { wrapper: InstanceWrapper; host: Module } | undefined {
    // 1. Check own providers
    if (moduleRef.providers.has(token)) {
      return { wrapper: moduleRef.providers.get(token)!, host: moduleRef };
    }

    // 2. Check imported modules' exports
    return this.lookupInImports(token, moduleRef, new Set());
  }

  // ── Private: Class resolution ────────────────────────────────────────────

  /**
   * Resolve a class provider by reading constructor metadata and instantiating.
   *
   * Steps:
   * 1. Read constructor parameter types from metadata
   * 2. Resolve each dependency (respecting optional markers)
   * 3. Call `new Class(...resolvedDeps)`
   * 4. Apply property injection on the new instance
   *
   * @typeParam T - The type of the class instance
   * @param wrapper - The wrapper containing the class metatype
   * @param moduleRef - The module context for dependency lookup
   * @returns The newly created class instance
   *
   * @throws Error if a required dependency cannot be resolved
   */
  private async resolveClass<T>(wrapper: InstanceWrapper<T>, moduleRef: Module): Promise<T> {
    const metatype = wrapper.metatype as Type<T>;

    // Get constructor dependencies
    const deps = this.getConstructorDependencies(metatype);
    const optionalIndices = this.getOptionalDependencies(metatype);

    // Resolve each dependency
    const resolvedDeps = await Promise.all(
      deps.map(async (dep, index) => {
        // Unresolvable type (undefined, null, or generic Object from erased interfaces)
        if (dep === undefined || dep === null || dep === Object) {
          if (optionalIndices.includes(index)) return undefined;
          throw new Error(
            `Cannot resolve dependency at index [${index}] of ${metatype.name}. ` +
              `The dependency is undefined — this usually means a circular import or missing @Inject() decorator.`,
          );
        }

        try {
          return await this.resolveDependency(dep, moduleRef);
        } catch (err: Error | any) {
          // If the dependency is optional and resolution fails, return undefined
          if (optionalIndices.includes(index)) return undefined;
          throw new Error(
            `Cannot resolve dependency '${this.getTokenName(dep)}' at index [${index}] of ${metatype.name}. ` +
              `Make sure it is provided in the module or imported. Original: ${(err as Error).message}`,
          );
        }
      }),
    );

    // Instantiate the class with resolved dependencies
    const instance = new metatype(...resolvedDeps);

    // Apply property injection after construction
    await this.resolveProperties(instance, metatype, moduleRef);

    return instance;
  }

  // ── Private: Factory resolution ──────────────────────────────────────────

  /**
   * Resolve a factory provider by resolving its inject deps and calling the factory.
   *
   * For `useExisting` (alias) providers, the factory's dependencies
   * are resolved in the factory's host module, not the consumer's module.
   * This ensures cross-module aliases work correctly.
   *
   * @typeParam T - The type of the factory's return value
   * @param wrapper - The wrapper containing the factory function and inject tokens
   * @param moduleRef - The module context (may be overridden by wrapper.host)
   * @returns The value produced by the factory (awaited if async)
   *
   * @throws Error if a factory dependency cannot be resolved
   */
  private async resolveFactory<T>(wrapper: InstanceWrapper<T>, moduleRef: Module): Promise<T> {
    const factory = wrapper.metatype as (...args: unknown[]) => T | Promise<T>;
    const injectTokens = wrapper.inject ?? [];

    // Use the factory's host module for dependency resolution.
    // Critical for useExisting aliases — the alias lives in module A
    // but is consumed from module B. The alias's inject deps must be
    // resolved in module A, not B.
    const resolveContext = wrapper.host ?? moduleRef;

    // Resolve factory dependencies
    const resolvedDeps = await Promise.all(
      injectTokens.map(async (token) => {
        try {
          return await this.resolveDependency(token, resolveContext);
        } catch (err: Error | any) {
          throw new Error(
            `Cannot resolve factory dependency '${this.getTokenName(token)}' ` +
              `for provider '${wrapper.name}'. ${(err as Error).message}`,
          );
        }
      }),
    );

    // Call the factory and handle async results
    const result = factory(...resolvedDeps);
    return result instanceof Promise ? await result : result;
  }

  // ── Private: Dependency resolution ───────────────────────────────────────

  /**
   * Resolve a single dependency token to its instance.
   *
   * Looks up the provider by token, resolves it if needed (or if transient),
   * and returns the instance. Handles async values by awaiting them.
   *
   * @param token - The injection token to resolve
   * @param moduleRef - The module context for provider lookup
   * @returns The resolved provider instance
   *
   * @throws Error if the provider is not found in the module or its imports
   */
  private async resolveDependency(token: InjectionToken, moduleRef: Module): Promise<any> {
    const result = this.lookupProvider(token, moduleRef);

    if (!result) {
      throw new Error(
        `Provider '${this.getTokenName(token)}' not found. ` +
          `Is it provided in the current module or an imported module?`,
      );
    }

    const { wrapper, host } = result;

    // Resolve if not yet resolved, or if transient (always create new)
    if (!wrapper.isResolved || wrapper.isTransient) {
      return this.resolveInstance(wrapper, host);
    }

    // Handle async values (Promise instances stored as values)
    if (wrapper.async && wrapper.instance instanceof Promise) {
      wrapper.instance = await wrapper.instance;
    }

    return wrapper.instance;
  }

  /**
   * Look up a provider in imported modules' exports.
   *
   * Searches breadth-first through the import tree, only considering
   * providers that are in the imported module's exports set. Tracks
   * visited modules to avoid infinite loops from circular imports.
   *
   * @param token - The injection token to look up
   * @param moduleRef - The module whose imports to search
   * @param visited - Set of already-visited module IDs (for cycle prevention)
   * @returns The wrapper and host module, or `undefined` if not found
   */
  private lookupInImports(
    token: InjectionToken,
    moduleRef: Module,
    visited: Set<string>,
  ): { wrapper: InstanceWrapper; host: Module } | undefined {
    for (const importedModule of moduleRef.imports) {
      if (visited.has(importedModule.id)) continue;
      visited.add(importedModule.id);

      // Check if the imported module exports this token AND has a provider for it
      if (importedModule.exports.has(token) && importedModule.providers.has(token)) {
        return {
          wrapper: importedModule.providers.get(token)!,
          host: importedModule,
        };
      }

      // Recurse into the imported module's imports (for re-exported modules)
      const result = this.lookupInImports(token, importedModule, visited);
      if (result) return result;
    }

    return undefined;
  }

  // ── Private: Metadata reading ────────────────────────────────────────────

  /**
   * Get the constructor dependencies for a class.
   *
   * Merges TypeScript's auto-emitted `design:paramtypes` with
   * explicitly declared `self:paramtypes` (from `@Inject()` decorators).
   * Explicit declarations override auto-detected types at the
   * corresponding parameter index.
   *
   * Also checks the prototype chain to handle cases where bundlers
   * (SWC, esbuild) create wrapper classes during decoration — the
   * parameter decorators may have stored metadata on the original
   * class while the class decorator created a new reference.
   *
   * @param type - The class to read constructor metadata from
   * @returns Array of injection tokens, one per constructor parameter
   */
  private getConstructorDependencies(type: Type<any>): InjectionToken[] {
    // Auto-detected types from TypeScript's emitDecoratorMetadata.
    // hasOwnMetadata handles the SWC/esbuild bundler case where a wrapper class
    // is created during decoration — param decorators may have stored metadata on
    // the original class while the class decorator created a new reference.
    const paramTypes: any[] = [
      ...(getMetadata<InjectionToken[]>(PARAMTYPES_METADATA, type) ??
        (hasOwnMetadata(PARAMTYPES_METADATA, type)
          ? getMetadata<InjectionToken[]>(PARAMTYPES_METADATA, type)
          : undefined) ??
        []),
    ];

    // Explicit overrides from @Inject() decorators — merged over auto-detected types
    const selfDeclared: Array<{ index: number; param: InjectionToken }> =
      getMetadata<Array<{ index: number; param: InjectionToken }>>(
        SELF_DECLARED_DEPS_METADATA,
        type,
      ) ?? [];

    // Merge: explicit @Inject() overrides auto-detected types at each index
    for (const { index, param } of selfDeclared) {
      paramTypes[index] = param;
    }

    return paramTypes;
  }

  /**
   * Get the indices of optional constructor parameters.
   *
   * Reads the `optional:paramtypes` metadata set by the `@Optional()` decorator.
   * Checks both the class and its prototype chain for the same reason as
   * `getConstructorDependencies` — bundler wrapper classes.
   *
   * @param type - The class to read optional metadata from
   * @returns Array of parameter indices that are marked as optional
   */
  private getOptionalDependencies(type: Type<any>): number[] {
    return getMetadata<number[]>(OPTIONAL_DEPS_METADATA, type) ?? [];
  }

  /**
   * Resolve property-injected dependencies and assign them to the instance.
   *
   * Reads `self:properties_metadata` for injection targets and
   * `optional:properties_metadata` for optional markers. For each
   * property, resolves the dependency and assigns it to the instance.
   *
   * @typeParam T - The type of the instance receiving property injection
   * @param instance - The already-constructed instance to inject properties into
   * @param type - The class to read property metadata from
   * @param moduleRef - The module context for dependency lookup
   *
   * @throws Error if a required property dependency cannot be resolved
   */
  private async resolveProperties<T>(instance: T, type: Type<T>, moduleRef: Module): Promise<void> {
    // Batch-read both property metadata keys in one call
    const {
      [PROPERTY_DEPS_METADATA]: properties,
      [OPTIONAL_PROPERTY_DEPS_METADATA]: optionalKeys,
    } = getAllMetadata<{
      [PROPERTY_DEPS_METADATA]: Array<{ key: string | symbol; type: InjectionToken }>;
      [OPTIONAL_PROPERTY_DEPS_METADATA]: Array<string | symbol>;
    }>([PROPERTY_DEPS_METADATA, OPTIONAL_PROPERTY_DEPS_METADATA], type);

    const resolvedProperties = properties ?? [];
    const resolvedOptionalKeys = optionalKeys ?? [];

    for (const prop of resolvedProperties) {
      const isOptional = resolvedOptionalKeys.includes(prop.key);

      try {
        const resolved = await this.resolveDependency(prop.type, moduleRef);
        (instance as any)[prop.key] = resolved;
      } catch (err: Error | any) {
        if (!isOptional) throw err;
        // Optional property — leave as undefined
      }
    }
  }

  // ── Private: Helpers ─────────────────────────────────────────────────────

  /**
   * Format the resolution stack for circular dependency error messages.
   *
   * Produces a human-readable chain like `A → B → C → A` showing
   * the full circular dependency path.
   *
   * @param token - The token that caused the circular dependency
   * @returns A formatted string showing the resolution chain
   */
  private formatResolutionStack(token: InjectionToken): string {
    const stack = [...this.resolutionStack, token];
    return stack.map((t) => this.getTokenName(t)).join(" → ");
  }

  /**
   * Get a human-readable name from an injection token.
   *
   * Returns the class name for functions, string representation for
   * symbols, and `String()` coercion for everything else.
   *
   * @param token - The injection token to convert to a readable name
   * @returns A human-readable string representation
   */
  private getTokenName(token: InjectionToken): string {
    if (typeof token === "function") return token.name;
    if (typeof token === "symbol") return token.toString();
    return String(token);
  }
}
