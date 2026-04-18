/**
 * Scope Options Interface
 *
 * Configuration options for the `@Injectable()` decorator that control
 * provider lifecycle scoping.
 *
 * @module interfaces/scope-options
 */

import type { Scope } from '@/enums/scope.enum';

/**
 * Options that can be passed to `@Injectable()` to control provider scoping.
 *
 * When no options are provided, the provider defaults to singleton scope
 * (`Scope.DEFAULT`), meaning one instance is shared across the entire
 * application.
 *
 * @example
 * ```typescript
 * // Transient — new instance per injection point
 * @Injectable({ scope: Scope.TRANSIENT })
 * class TransientService {}
 *
 * // Default (singleton) — omitting options is equivalent
 * @Injectable()
 * class SingletonService {}
 * ```
 */
export interface ScopeOptions {
  /**
   * The scope of the provider.
   *
   * Controls how instances are shared:
   * - `Scope.DEFAULT` — Singleton, one instance for the whole app
   * - `Scope.TRANSIENT` — New instance per injection point
   *
   * @default Scope.DEFAULT
   */
  scope?: Scope;
}
