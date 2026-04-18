/**
 * Value Provider Interface
 *
 * Binds a token to a pre-existing value with no instantiation.
 *
 * @module interfaces/value-provider
 */

import type { InjectionToken } from './injection-token.interface';

/**
 * Value provider — binds a token to a pre-existing value.
 *
 * No instantiation occurs. The exact value is returned as-is.
 * Useful for configuration objects, constants, and pre-built instances.
 *
 * @typeParam T - The type of the provided value
 *
 * @example
 * ```typescript
 * // Bind a configuration object
 * { provide: CACHE_CONFIG, useValue: { default: 'memory', stores: { ... } } }
 *
 * // Bind a primitive
 * { provide: 'API_URL', useValue: 'https://api.example.com' }
 *
 * // Bind a pre-built instance
 * { provide: Logger, useValue: new Logger('app') }
 * ```
 */
export interface ValueProvider<T = any> {
  /**
   * The injection token.
   * Can be a class, string, or symbol.
   */
  provide: InjectionToken;

  /**
   * The value to inject. Returned as-is, no instantiation.
   * Can be any value including `null`, `undefined`, or a `Promise`.
   */
  useValue: T;
}
