/**
 * isExistingProvider Type Guard
 *
 * Determines whether a provider uses `useExisting` to alias one token
 * to another, delegating resolution to the target.
 *
 * @module utils/is-existing-provider
 */

import type { Provider } from "@/interfaces/provider.interface";
import type { ExistingProvider } from "@/interfaces/existing-provider.interface";
import { isCustomProvider } from "./is-custom-provider.util";

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
    "useExisting" in provider &&
    (provider as unknown as Record<string, unknown>).useExisting !== undefined
  );
}
