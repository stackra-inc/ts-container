/**
 * isClassProvider Type Guard
 *
 * Determines whether a provider uses `useClass` to bind a token
 * to a class that the container will instantiate.
 *
 * @module utils/is-class-provider
 */

import type { Provider } from "@/interfaces/provider.interface";
import type { ClassProvider } from "@/interfaces/class-provider.interface";
import { isCustomProvider } from "./is-custom-provider.util";

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
    isCustomProvider(provider) &&
    "useClass" in provider &&
    (provider as unknown as Record<string, unknown>).useClass !== undefined
  );
}
