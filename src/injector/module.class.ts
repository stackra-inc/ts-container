/**
 * Module — Runtime Representation of a @Module() Class
 *
 * Each `@Module()` decorated class gets a corresponding `Module` instance
 * at runtime. The Module holds:
 * - All provider bindings (as InstanceWrappers)
 * - References to imported modules
 * - The set of exported tokens
 *
 * ## Module lifecycle:
 *
 * 1. **Registration** — The scanner creates a Module instance and registers
 *    providers, imports, and exports based on the @Module() metadata.
 *
 * 2. **Resolution** — The injector resolves all providers in the module,
 *    creating instances and injecting dependencies.
 *
 * 3. **Lifecycle hooks** — After all providers are resolved, onModuleInit()
 *    is called on providers that implement it.
 *
 * @module injector/module
 */

import { getMetadata } from "@vivtel/metadata";

import type { Type } from "@/types/type.type";
import type { InjectionToken } from "@/interfaces/injection-token.interface";
import type { Provider } from "@/interfaces/provider.interface";
import type { ClassProvider } from "@/interfaces/class-provider.interface";
import type { ValueProvider } from "@/interfaces/value-provider.interface";
import type { FactoryProvider } from "@/interfaces/factory-provider.interface";
import type { ExistingProvider } from "@/interfaces/existing-provider.interface";
import { Scope } from "@/enums/scope.enum";
import {
  isCustomProvider,
  isClassProvider,
  isValueProvider,
  isFactoryProvider,
  isExistingProvider,
} from "@/utils";
import { InstanceWrapper } from "./instance-wrapper.class";
import { SCOPE_OPTIONS_METADATA } from "@/constants";

/**
 * Runtime representation of a module.
 *
 * Created by the scanner for each `@Module()` class encountered during
 * the module graph traversal. Holds all provider bindings, import
 * relationships, and export declarations for the module.
 *
 * @example
 * ```typescript
 * const moduleRef = new Module(UserModule);
 * moduleRef.addProvider(UserService);
 * moduleRef.addProvider({ provide: 'API_URL', useValue: 'https://...' });
 * moduleRef.addExport(UserService);
 * ```
 */
export class Module {
  /**
   * Unique identifier for this module instance.
   * Generated from the class name plus a random suffix to handle
   * multiple registrations of the same module class.
   */
  public readonly id: string;

  /**
   * The original class decorated with `@Module()`.
   * Used to read metadata and for identification in error messages.
   */
  public readonly metatype: Type<any>;

  /**
   * Whether this module is global (its exports are available everywhere).
   * Set by the container when the module has `@Global()` or `global: true`.
   *
   * @default false
   */
  public isGlobal: boolean = false;

  /**
   * The opaque token used to identify this module in the container.
   * Typically the class name, set by the container during registration.
   */
  public token: string = "";

  /**
   * Distance from the root module in the dependency graph.
   * Used to determine lifecycle hook execution order (closer to root = earlier).
   *
   * @default 0
   */
  public distance: number = 0;

  /**
   * All providers registered in this module.
   * Key: injection token, Value: InstanceWrapper containing the binding metadata.
   */
  private readonly _providers = new Map<InjectionToken, InstanceWrapper>();

  /**
   * Imported modules whose exports are available to this module's providers.
   */
  private readonly _imports = new Set<Module>();

  /**
   * Tokens that this module exports (available to modules that import this one).
   */
  private readonly _exports = new Set<InjectionToken>();

  /**
   * Create a new Module for the given class.
   *
   * Generates a unique ID from the class name and a random suffix.
   *
   * @param metatype - The `@Module()` decorated class
   */
  constructor(metatype: Type<any>) {
    this.metatype = metatype;
    this.id = `${metatype.name}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  /**
   * The module's human-readable name (the class name).
   *
   * @returns The name of the module's metatype class
   */
  get name(): string {
    return this.metatype.name;
  }

  /**
   * All providers registered in this module.
   *
   * @returns A `Map` of injection tokens to `InstanceWrapper`s
   */
  get providers(): Map<InjectionToken, InstanceWrapper> {
    return this._providers;
  }

  /**
   * All imported modules.
   *
   * @returns A `Set` of imported `Module` instances
   */
  get imports(): Set<Module> {
    return this._imports;
  }

  /**
   * All exported tokens.
   *
   * @returns A `Set` of exported `InjectionToken`s
   */
  get exports(): Set<InjectionToken> {
    return this._exports;
  }

  // ── Provider registration ────────────────────────────────────────────────

  /**
   * Register a provider in this module.
   *
   * Handles all provider forms:
   * - Class shorthand: `UserService`
   * - Class provider: `{ provide: Token, useClass: UserService }`
   * - Value provider: `{ provide: Token, useValue: someValue }`
   * - Factory provider: `{ provide: Token, useFactory: fn, inject: [...] }`
   * - Existing provider: `{ provide: Token, useExisting: OtherToken }`
   *
   * Creates an `InstanceWrapper` for the provider and stores it in the
   * providers map, keyed by the injection token.
   *
   * @param provider - The provider to register (any valid provider form)
   * @returns The injection token for this provider
   *
   * @example
   * ```typescript
   * moduleRef.addProvider(UserService);
   * moduleRef.addProvider({ provide: CACHE_CONFIG, useValue: config });
   * ```
   */
  public addProvider(provider: Provider): InjectionToken {
    if (isCustomProvider(provider)) {
      return this.addCustomProvider(provider);
    }

    // Class shorthand — the class itself is both the token and the implementation
    const classRef = provider as Type<any>;
    const scope = this.getClassScope(classRef);

    this._providers.set(
      classRef,
      new InstanceWrapper({
        token: classRef,
        name: classRef.name,
        metatype: classRef,
        instance: null,
        isResolved: false,
        scope,
        host: this,
      }),
    );

    return classRef;
  }

  /**
   * Register a custom provider (one with a `provide` property).
   *
   * Dispatches to the appropriate registration method based on the
   * provider type (class, value, factory, or existing).
   *
   * @param provider - The custom provider to register
   * @returns The injection token from the provider's `provide` property
   */
  private addCustomProvider(
    provider: ClassProvider | ValueProvider | FactoryProvider | ExistingProvider,
  ): InjectionToken {
    if (isClassProvider(provider)) {
      this.addClassProvider(provider);
    } else if (isValueProvider(provider)) {
      this.addValueProvider(provider);
    } else if (isFactoryProvider(provider)) {
      this.addFactoryProvider(provider);
    } else if (isExistingProvider(provider)) {
      this.addExistingProvider(provider);
    }
    return provider.provide;
  }

  /**
   * Register a class provider: `{ provide: Token, useClass: SomeClass }`.
   *
   * Creates an `InstanceWrapper` with the class as the metatype.
   * The injector will later resolve constructor dependencies and
   * call `new useClass(...deps)`.
   *
   * @param provider - The class provider to register
   */
  private addClassProvider(provider: ClassProvider): void {
    const scope = provider.scope ?? this.getClassScope(provider.useClass);

    this._providers.set(
      provider.provide,
      new InstanceWrapper({
        token: provider.provide,
        name: provider.useClass?.name ?? String(provider.provide),
        metatype: provider.useClass,
        instance: null,
        isResolved: false,
        scope,
        host: this,
      }),
    );
  }

  /**
   * Register a value provider: `{ provide: Token, useValue: value }`.
   *
   * Value providers are immediately resolved — the value is stored as-is
   * with `isResolved: true`. No instantiation or dependency resolution
   * occurs for value providers.
   *
   * @param provider - The value provider to register
   */
  private addValueProvider(provider: ValueProvider): void {
    this._providers.set(
      provider.provide,
      new InstanceWrapper({
        token: provider.provide,
        name: this.getTokenName(provider.provide),
        metatype: null,
        instance: provider.useValue,
        isResolved: true,
        async: provider.useValue instanceof Promise,
        host: this,
      }),
    );
  }

  /**
   * Register a factory provider: `{ provide: Token, useFactory: fn, inject: [...] }`.
   *
   * The factory function is stored as the metatype and will be called
   * (not constructed with `new`) during resolution. The `inject` array
   * specifies which dependencies to resolve and pass as arguments.
   *
   * @param provider - The factory provider to register
   */
  private addFactoryProvider(provider: FactoryProvider): void {
    this._providers.set(
      provider.provide,
      new InstanceWrapper({
        token: provider.provide,
        name: this.getTokenName(provider.provide),
        metatype: provider.useFactory as any,
        instance: null,
        isResolved: false,
        inject: provider.inject ?? [],
        scope: provider.scope ?? Scope.DEFAULT,
        host: this,
      }),
    );
  }

  /**
   * Register an existing (alias) provider: `{ provide: Token, useExisting: OtherToken }`.
   *
   * Implemented as a synthetic factory that receives the target instance
   * and returns it directly. The `inject` array contains the target token,
   * and the `isAlias` flag is set for debugging purposes.
   *
   * @param provider - The existing (alias) provider to register
   */
  private addExistingProvider(provider: ExistingProvider): void {
    this._providers.set(
      provider.provide,
      new InstanceWrapper({
        token: provider.provide,
        name: this.getTokenName(provider.provide),
        metatype: ((instance: any) => instance) as any,
        instance: null,
        isResolved: false,
        inject: [provider.useExisting],
        isAlias: true,
        host: this,
      }),
    );
  }

  // ── Imports & Exports ────────────────────────────────────────────────────

  /**
   * Add an imported module.
   *
   * The imported module's exported providers become available for
   * dependency resolution within this module.
   *
   * @param moduleRef - The module to import
   */
  public addImport(moduleRef: Module): void {
    this._imports.add(moduleRef);
  }

  /**
   * Add an exported token.
   *
   * Exported tokens are available to modules that import this module.
   * The token must correspond to a provider registered in this module.
   *
   * @param token - The token to export (class, string, symbol, or module class)
   */
  public addExport(token: InjectionToken): void {
    this._exports.add(token);
  }

  /**
   * Check if this module has a provider for the given token.
   *
   * @param token - The injection token to check
   * @returns `true` if a provider is registered for this token
   */
  public hasProvider(token: InjectionToken): boolean {
    return this._providers.has(token);
  }

  /**
   * Get a provider wrapper by token.
   *
   * @typeParam T - The expected type of the provider instance
   * @param token - The injection token to look up
   * @returns The `InstanceWrapper` for the token, or `undefined` if not found
   *
   * @example
   * ```typescript
   * const wrapper = moduleRef.getProviderByToken(UserService);
   * if (wrapper?.isResolved) {
   *   logger.info(wrapper.instance);
   * }
   * ```
   */
  public getProviderByToken<T = any>(token: InjectionToken): InstanceWrapper<T> | undefined {
    return this._providers.get(token) as InstanceWrapper<T> | undefined;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Read the scope from a class's `@Injectable()` metadata.
   *
   * Falls back to `Scope.DEFAULT` (singleton) if no scope options
   * are defined on the class.
   *
   * @param type - The class to read scope metadata from
   * @returns The provider scope
   */
  private getClassScope(type: Type<any>): Scope {
    const options = getMetadata<{ scope?: Scope }>(SCOPE_OPTIONS_METADATA, type);
    return options?.scope ?? Scope.DEFAULT;
  }

  /**
   * Get a human-readable name from an injection token.
   *
   * @param token - The injection token to convert
   * @returns A human-readable string representation
   */
  private getTokenName(token: InjectionToken): string {
    if (typeof token === "function") return token.name;
    if (typeof token === "symbol") return token.toString();
    return String(token);
  }

  /**
   * Create an instance of a class with DI-resolved dependencies.
   *
   * This method allows you to instantiate classes outside the normal DI flow,
   * useful for factories, dynamic components, or manual instantiation with
   * custom arguments.
   *
   * **Note:** This method requires the module to have an injector attached,
   * which happens automatically when you get the module via `app.getModuleRef()`.
   *
   * @typeParam T - The type of the instance to create
   * @param type - The class to instantiate
   * @param customArgs - Optional custom arguments to override DI resolution
   * @returns A new instance with dependencies injected
   *
   * @throws Error if no injector is attached to the module
   * @throws Error if a required dependency cannot be resolved
   *
   * @example
   * ```typescript
   * // Get module reference from application
   * const moduleRef = app.getModuleRef(UserModule);
   *
   * // With DI-resolved dependencies
   * const service = moduleRef.create(UserService);
   *
   * // With custom arguments
   * const service = moduleRef.create(UserService, [customDb, customLogger]);
   * ```
   */
  public create<T>(type: Type<T>, customArgs?: any[]): T {
    const injector = (this as any).__injector__;

    if (!injector) {
      throw new Error(
        "ModuleRef.create() requires an injector instance. " +
          "Get the module reference via app.getModuleRef(ModuleClass) to use this method.",
      );
    }

    // If custom args provided, use them directly
    if (customArgs) {
      return new type(...customArgs);
    }

    // Otherwise, resolve dependencies via DI
    const deps = (injector as any).getConstructorDependencies(type);
    const optionalIndices: number[] = (injector as any).getOptionalDependencies(type);

    const resolvedDeps = deps.map((dep: InjectionToken, index: number) => {
      if (dep === undefined || dep === null || dep === Object) {
        if (optionalIndices.includes(index)) return undefined;
        return undefined;
      }

      const result = injector.lookupProvider(dep, this);
      if (!result) {
        if (optionalIndices.includes(index)) return undefined;
        throw new Error(
          `Cannot resolve dependency '${this.getTokenName(dep)}' for ModuleRef.create(${type.name})`,
        );
      }

      return result.wrapper.instance;
    });

    return new type(...resolvedDeps);
  }
}
