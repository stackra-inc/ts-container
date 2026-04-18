/**
 * Factory Provider Interface
 *
 * Binds a token to a factory function that produces the value,
 * optionally with injected dependencies.
 *
 * @module interfaces/factory-provider
 */

import type { InjectionToken } from './injection-token.interface';
import type { Scope } from '@/enums/scope.enum';

/**
 * Factory provider — binds a token to a factory function.
 *
 * The factory function is called once (for singletons) or per-injection
 * (for transients). Dependencies can be injected into the factory via
 * the `inject` array.
 *
 * @typeParam T - The type of the value produced by the factory
 *
 * @example
 * ```typescript
 * // Simple factory
 * {
 *   provide: 'CONNECTION',
 *   useFactory: () => createConnection({ host: 'localhost' }),
 * }
 *
 * // Factory with injected dependencies
 * {
 *   provide: CacheManager,
 *   useFactory: (config: ConfigService) => new CacheManager(config.get('cache')),
 *   inject: [ConfigService],
 * }
 *
 * // Async factory
 * {
 *   provide: 'DB_CONNECTION',
 *   useFactory: async (config: ConfigService) => {
 *     const conn = await createConnection(config.get('database'));
 *     return conn;
 *   },
 *   inject: [ConfigService],
 * }
 * ```
 */
export interface FactoryProvider<T = any> {
  /**
   * The injection token.
   * Can be a class, string, or symbol.
   */
  provide: InjectionToken;

  /**
   * Factory function that creates the value.
   *
   * Receives resolved dependencies (from `inject`) as arguments.
   * Can be async — the container awaits the result.
   */
  useFactory: (...args: any[]) => T | Promise<T>;

  /**
   * Tokens to inject as arguments to the factory function.
   * The resolved instances are passed in the same order as the tokens.
   *
   * @default []
   */
  inject?: InjectionToken[];

  /**
   * Optional scope override.
   *
   * @default Scope.DEFAULT
   */
  scope?: Scope;
}
