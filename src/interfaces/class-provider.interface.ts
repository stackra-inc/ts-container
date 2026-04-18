/**
 * Class Provider Interface
 *
 * Binds a token to a class that will be instantiated by the container.
 *
 * @module interfaces/class-provider
 */

import type { Type } from './type.interface';
import type { InjectionToken } from './injection-token.interface';
import type { Scope } from '@/enums/scope.enum';

/**
 * Class provider — binds a token to a class that will be instantiated by the container.
 *
 * The container will:
 * 1. Read the class's constructor parameter types
 * 2. Resolve each dependency recursively
 * 3. Call `new useClass(...resolvedDeps)`
 *
 * @typeParam T - The type of the instance created by the class
 *
 * @example
 * ```typescript
 * // Bind an interface token to a concrete implementation
 * { provide: 'IUserRepository', useClass: PostgresUserRepository }
 *
 * // Bind a class to itself (same as just listing the class)
 * { provide: UserService, useClass: UserService }
 * ```
 */
export interface ClassProvider<T = any> {
  /**
   * The injection token (what consumers ask for).
   * Can be a class, string, or symbol.
   */
  provide: InjectionToken;

  /**
   * The class to instantiate when this token is requested.
   * Must be decorated with `@Injectable()`.
   */
  useClass: Type<T>;

  /**
   * Optional scope override.
   * If omitted, falls back to the class's own `@Injectable()` scope.
   *
   * @default Scope.DEFAULT
   */
  scope?: Scope;
}
