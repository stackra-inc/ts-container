/**
 * isCustomProvider Type Guard
 *
 * Determines whether a provider is a custom provider (has a `provide` property)
 * as opposed to a class shorthand provider (plain class constructor).
 *
 * @module utils/is-custom-provider
 */

import type { Provider } from "@/interfaces/provider.interface";
import type { ClassProvider } from "@/interfaces/class-provider.interface";
import type { ValueProvider } from "@/interfaces/value-provider.interface";
import type { FactoryProvider } from "@/interfaces/factory-provider.interface";
import type { ExistingProvider } from "@/interfaces/existing-provider.interface";

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
  provider: Provider,
): provider is ClassProvider | ValueProvider | FactoryProvider | ExistingProvider {
  return provider !== null && typeof provider === "object" && "provide" in provider;
}
