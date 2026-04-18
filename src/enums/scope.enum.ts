/**
 * Provider Scope Enum
 *
 * Defines the lifecycle scope of a provider instance.
 * For client-side applications, `DEFAULT` (singleton) is the most common.
 *
 * @module interfaces/scope
 */

/**
 * Determines how provider instances are shared across the application.
 *
 * - `DEFAULT` — Singleton. One instance shared across the entire application.
 *   This is the default and most common scope for client-side apps.
 *
 * - `TRANSIENT` — A new instance is created every time the provider is injected.
 *   Useful for stateful services that shouldn't be shared.
 *
 * @example
 * ```typescript
 * // Singleton (default) — one instance for the whole app
 * @Injectable()
 * class ConfigService {}
 *
 * // Transient — new instance per injection
 * @Injectable({ scope: Scope.TRANSIENT })
 * class RequestLogger {}
 * ```
 */
export enum Scope {
  /**
   * Singleton scope.
   *
   * The provider is instantiated once and shared across all consumers.
   * This is the default scope when no scope option is specified.
   *
   * @example
   * ```typescript
   * @Injectable() // Scope.DEFAULT is implied
   * class ConfigService {}
   * ```
   */
  DEFAULT = 0,

  /**
   * Transient scope.
   *
   * A new instance is created for every injection point.
   * Each consumer gets its own dedicated instance.
   *
   * @example
   * ```typescript
   * @Injectable({ scope: Scope.TRANSIENT })
   * class RequestLogger {
   *   private readonly id = Math.random();
   * }
   * ```
   */
  TRANSIENT = 1,
}
