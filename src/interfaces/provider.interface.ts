/**
 * Provider Union Type & Type Guards
 *
 * The `Provider` type is a discriminated union of all provider forms.
 * This file also contains type guard functions for classifying providers.
 *
 * Individual provider interfaces are defined in their own files:
 * - {@link ClassProvider} — `class-provider.interface.ts`
 * - {@link ValueProvider} — `value-provider.interface.ts`
 * - {@link FactoryProvider} — `factory-provider.interface.ts`
 * - {@link ExistingProvider} — `existing-provider.interface.ts`
 *
 * @module interfaces/provider
 */

import type { Type } from './type.interface';
import type { ClassProvider } from './class-provider.interface';
import type { ValueProvider } from './value-provider.interface';
import type { FactoryProvider } from './factory-provider.interface';
import type { ExistingProvider } from './existing-provider.interface';

/**
 * Discriminated union of all provider forms.
 *
 * A provider can be:
 * - A class reference (shorthand for `{ provide: Class, useClass: Class }`)
 * - A `ClassProvider`
 * - A `ValueProvider`
 * - A `FactoryProvider`
 * - An `ExistingProvider`
 *
 * The `provide` property (present on all custom providers) acts as the
 * discriminant. Class shorthand providers are plain class constructors.
 *
 * @typeParam T - The type of the provider instance
 *
 * @example
 * ```typescript
 * const providers: Provider[] = [
 *   UserService,                                          // class shorthand
 *   { provide: 'API_URL', useValue: 'https://...' },     // value
 *   { provide: CacheManager, useClass: CacheManager },   // class
 *   { provide: DB, useFactory: () => connect() },        // factory
 *   { provide: CACHE, useExisting: CacheManager },       // alias
 * ];
 * ```
 */
export type Provider<T = any> =
  | Type<T>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

// ─────────────────────────────────────────────────────────────────────────────
// Type guards for provider classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a provider is a custom provider (has a `provide` property).
 *
 * Custom providers are objects with an explicit `provide` token, as opposed
 * to class shorthand providers which are just class constructors.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider is an object with a `provide` property
 *
 * @example
 * ```typescript
 * isCustomProvider(UserService);                              // false
 * isCustomProvider({ provide: 'TOKEN', useValue: 'hello' });  // true
 * ```
 */
export function isCustomProvider(
  provider: Provider
): provider is ClassProvider | ValueProvider | FactoryProvider | ExistingProvider {
  return provider !== null && typeof provider === 'object' && 'provide' in provider;
}

/**
 * Check if a provider is a class shorthand (just a class reference).
 *
 * Class shorthand is the simplest provider form — the class itself serves
 * as both the injection token and the implementation.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider is a function (class constructor)
 *
 * @example
 * ```typescript
 * isClassShorthand(UserService);                              // true
 * isClassShorthand({ provide: UserService, useClass: UserService }); // false
 * ```
 */
export function isClassShorthand(provider: Provider): provider is Type {
  return typeof provider === 'function';
}

/**
 * Check if a provider uses `useClass`.
 *
 * Class providers bind a token to a class that the container will
 * instantiate with resolved constructor dependencies.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider has both `provide` and `useClass` properties
 *
 * @example
 * ```typescript
 * isClassProvider({ provide: 'IRepo', useClass: PostgresRepo }); // true
 * isClassProvider({ provide: 'URL', useValue: 'https://...' });  // false
 * ```
 */
export function isClassProvider(provider: Provider): provider is ClassProvider {
  return (
    isCustomProvider(provider) && 'useClass' in provider && (provider as any).useClass !== undefined
  );
}

/**
 * Check if a provider uses `useValue`.
 *
 * Value providers bind a token to a pre-existing value with no
 * instantiation or dependency resolution.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider has both `provide` and `useValue` properties
 *
 * @example
 * ```typescript
 * isValueProvider({ provide: 'API_URL', useValue: 'https://...' }); // true
 * isValueProvider({ provide: DB, useFactory: () => connect() });    // false
 * ```
 */
export function isValueProvider(provider: Provider): provider is ValueProvider {
  return isCustomProvider(provider) && 'useValue' in provider;
}

/**
 * Check if a provider uses `useFactory`.
 *
 * Factory providers bind a token to a factory function that produces
 * the value, optionally with injected dependencies.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider has `provide` and a callable `useFactory`
 *
 * @example
 * ```typescript
 * isFactoryProvider({ provide: DB, useFactory: () => connect() });    // true
 * isFactoryProvider({ provide: DB, useClass: DatabaseService });      // false
 * ```
 */
export function isFactoryProvider(provider: Provider): provider is FactoryProvider {
  return (
    isCustomProvider(provider) &&
    'useFactory' in provider &&
    typeof (provider as any).useFactory === 'function'
  );
}

/**
 * Check if a provider uses `useExisting`.
 *
 * Existing (alias) providers bind a token to another token, delegating
 * resolution to the target. Both tokens resolve to the same instance.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider has both `provide` and `useExisting` properties
 *
 * @example
 * ```typescript
 * isExistingProvider({ provide: CACHE, useExisting: CacheManager }); // true
 * isExistingProvider({ provide: CACHE, useValue: new Cache() });     // false
 * ```
 */
export function isExistingProvider(provider: Provider): provider is ExistingProvider {
  return (
    isCustomProvider(provider) &&
    'useExisting' in provider &&
    (provider as any).useExisting !== undefined
  );
}
