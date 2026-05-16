/**
 * Scope Enum
 *
 * Defines the lifecycle scope of a DI-managed provider. Controls how
 * many instances the injector creates and how long they live.
 *
 * @module enums/scope
 */

/**
 * DI provider scope.
 *
 * @example
 * ```typescript
 * @Injectable({ scope: Scope.TRANSIENT })
 * class RequestLogger {
 *   private readonly id = Math.random();
 * }
 * ```
 */
export enum Scope {
  /** Singleton — one instance shared across the entire app. */
  DEFAULT = "DEFAULT",
  /** Transient — new instance on every injection. */
  TRANSIENT = "TRANSIENT",
  /** Request — one instance per request (not applicable in browser). */
  REQUEST = "REQUEST",
}
