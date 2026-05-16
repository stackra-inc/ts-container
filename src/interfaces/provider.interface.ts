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

import type { Type } from "@/types/type.type";
import type { ClassProvider } from "./class-provider.interface";
import type { ValueProvider } from "./value-provider.interface";
import type { FactoryProvider } from "./factory-provider.interface";
import type { ExistingProvider } from "./existing-provider.interface";

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
