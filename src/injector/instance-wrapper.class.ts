/**
 * InstanceWrapper — Wraps a Provider Binding
 *
 * Every provider registered in a module gets wrapped in an InstanceWrapper.
 * The wrapper tracks:
 * - The injection token (how consumers ask for it)
 * - The metatype (the class/factory to instantiate)
 * - The resolved instance (once created)
 * - The scope (singleton vs transient)
 * - Whether it's been resolved yet
 * - Factory dependencies (for useFactory providers)
 *
 * This is a simplified version of NestJS's InstanceWrapper — we don't need
 * request scoping, context IDs, or transient maps for client-side use.
 *
 * @module injector/instance-wrapper
 */

import { Scope } from "@/enums/scope.enum";
import type { Module } from "./module.class";
import type { Type } from "@/types/type.type";
import type { InjectionToken } from "@/interfaces/injection-token.interface";

/**
 * Wraps a single provider binding with all its metadata and cached instance.
 *
 * Created by `Module.addProvider()` for each registered provider. The injector
 * reads the wrapper's metadata to determine how to resolve the provider
 * (class instantiation, factory call, or cached value) and stores the
 * resolved instance back on the wrapper.
 *
 * @typeParam T - The type of the provider instance
 *
 * @example
 * ```typescript
 * const wrapper = new InstanceWrapper({
 *   token: UserService,
 *   name: 'UserService',
 *   metatype: UserService,
 *   scope: Scope.DEFAULT,
 *   host: moduleRef,
 * });
 *
 * // After resolution:
 * wrapper.isResolved; // true
 * wrapper.instance;   // UserService instance
 * ```
 */
export class InstanceWrapper<T = any> {
  /**
   * Unique identifier for this wrapper instance.
   *
   * Generated at construction time. Stable for the lifetime of the wrapper.
   * Useful for React `key` props, devtools, and graph serialization.
   */
  public readonly id: string;

  /**
   * The injection token used to look up this provider.
   * Can be a class, string, or symbol.
   */
  public readonly token: InjectionToken;

  /**
   * Human-readable name for error messages and debugging.
   * Derived from the class name or token string representation.
   */
  public readonly name: string;

  /**
   * The class constructor or factory function.
   *
   * - For class providers: the class to `new`
   * - For factory providers: the factory function to call
   * - For value providers: `null` (no instantiation needed)
   */
  public metatype: Type<T> | ((...args: unknown[]) => unknown) | null;

  /**
   * The resolved instance.
   *
   * - `null` before resolution
   * - The actual instance after resolution
   * - For value providers: set immediately at registration time
   */
  public instance: T | null = null;

  /**
   * Whether this provider has been fully resolved (instance created).
   * Set to `true` after the injector successfully creates the instance.
   */
  public isResolved: boolean = false;

  /**
   * The lifecycle scope of this provider.
   *
   * @default Scope.DEFAULT (singleton)
   */
  public scope: Scope = Scope.DEFAULT;

  /**
   * For factory providers: the tokens to inject as factory arguments.
   * `null` for class and value providers.
   *
   * @default null
   */
  public inject: InjectionToken[] | null = null;

  /**
   * Whether this is an alias (`useExisting`) provider.
   * Alias providers delegate resolution to another token via a
   * synthetic factory.
   *
   * @default false
   */
  public isAlias: boolean = false;

  /**
   * Whether the instance is a Promise (from an async factory or async value).
   * When `true`, the injector awaits the instance before returning it.
   *
   * @default false
   */
  public async: boolean = false;

  /**
   * The module this provider belongs to.
   * Used by the injector for dependency resolution context, especially
   * for `useExisting` aliases that need to resolve in their host module.
   *
   * @default null
   */
  public host: Module | null = null;

  /**
   * Create a new InstanceWrapper with the given metadata.
   *
   * All properties except `token` are optional and default to sensible
   * values (null instance, unresolved, singleton scope, etc.).
   *
   * @param metadata - Initial values for the wrapper properties. The `token`
   *   property is required; all others fall back to defaults.
   *
   * @example
   * ```typescript
   * // Class provider wrapper
   * const wrapper = new InstanceWrapper({
   *   token: UserService,
   *   metatype: UserService,
   *   host: moduleRef,
   * });
   *
   * // Value provider wrapper (pre-resolved)
   * const wrapper = new InstanceWrapper({
   *   token: 'API_URL',
   *   name: 'API_URL',
   *   instance: 'https://api.example.com',
   *   isResolved: true,
   * });
   * ```
   */
  constructor(metadata: Partial<InstanceWrapper<T>> = {}) {
    this.token = metadata.token!;
    this.id = metadata.id ?? this.generateId();
    this.name = metadata.name ?? this.getTokenName(metadata.token!);
    this.metatype = metadata.metatype ?? null;
    this.instance = metadata.instance ?? null;
    this.isResolved = metadata.isResolved ?? false;
    this.scope = metadata.scope ?? Scope.DEFAULT;
    this.inject = metadata.inject ?? null;
    this.isAlias = metadata.isAlias ?? false;
    this.async = metadata.async ?? false;
    this.host = metadata.host ?? null;
  }

  /**
   * Whether this provider is a factory (has an `inject` array).
   *
   * Factory providers are invoked as functions, not constructed with `new`.
   * This includes both explicit `useFactory` providers and synthetic
   * factories created for `useExisting` aliases.
   *
   * @returns `true` if the provider has factory dependencies
   */
  get isFactory(): boolean {
    return this.inject !== null;
  }

  /**
   * Whether this provider is transient (new instance per injection).
   *
   * Transient providers are re-resolved on every injection, unlike
   * singletons which are cached after first resolution.
   *
   * @returns `true` if the provider's scope is `Scope.TRANSIENT`
   */
  get isTransient(): boolean {
    return this.scope === Scope.TRANSIENT;
  }

  /**
   * Extract a human-readable name from an injection token.
   *
   * Used to generate the `name` property when not explicitly provided.
   * Returns the class name for functions, string representation for
   * symbols, and `String()` coercion for everything else.
   *
   * @param token - The injection token to extract a name from
   * @returns A human-readable string representation of the token
   */
  private getTokenName(token: InjectionToken): string {
    if (typeof token === "function") return token.name;
    if (typeof token === "symbol") return token.toString();
    return String(token);
  }

  /**
   * Generate a unique identifier for this wrapper.
   *
   * Uses the token name plus a random suffix to ensure uniqueness
   * even when the same token is registered in multiple modules.
   *
   * @returns A unique string identifier
   */
  private generateId(): string {
    const prefix = this.getTokenName(this.token ?? "unknown");
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${suffix}`;
  }
}
