/**
 * Existing Provider Interface (Alias)
 *
 * Binds a token to another token, delegating resolution to the target.
 * Both tokens resolve to the same instance.
 *
 * @module interfaces/existing-provider
 */

import type { InjectionToken } from './injection-token.interface';

/**
 * Existing provider (alias) — binds a token to another token.
 *
 * When the alias token is requested, the container resolves the
 * target token instead. Useful for providing multiple tokens that
 * resolve to the same instance.
 *
 * @typeParam T - The type of the aliased provider instance
 *
 * @example
 * ```typescript
 * // Make CACHE_SERVICE resolve to the same instance as CacheManager
 * { provide: CACHE_SERVICE, useExisting: CacheManager }
 * ```
 */
export interface ExistingProvider<T = any> {
  /**
   * The alias injection token.
   * Consumers use this token to request the provider.
   */
  provide: InjectionToken;

  /**
   * The target token to resolve instead.
   * The container looks up this token and returns its instance.
   */
  useExisting: InjectionToken<T>;
}
