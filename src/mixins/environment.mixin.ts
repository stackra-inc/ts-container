/**
 * Environment Mixin
 *
 * Adds environment detection helpers to any class. Applied to
 * `ApplicationContext` so consumers can check `app.isProduction`,
 * `app.isDevelopment`, etc. without importing `Env` directly.
 *
 * Uses the mixin pattern — a function that takes a base class and
 * returns an extended class with the environment methods.
 *
 * @module @stackra/ts-container/mixins
 */

import { Env } from "@stackra/ts-support";

/**
 * Constructor type for mixin compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Interface describing the environment helpers added by the mixin.
 *
 * Consumers can type-check against this interface when they need
 * the environment methods without knowing the full class.
 */
export interface IEnvironmentAware {
  /** Current environment name (e.g., "production", "development"). */
  readonly environment: string;

  /** Whether the app is running in production. */
  readonly isProduction: boolean;

  /** Whether the app is running in development/local. */
  readonly isDevelopment: boolean;

  /** Whether the app is running in a testing environment. */
  readonly isTesting: boolean;

  /** Whether the app is running in staging. */
  readonly isStaging: boolean;

  /** Whether debug mode is enabled. */
  readonly isDebug: boolean;

  /** Check if the current environment matches a given name. */
  isEnvironment(name: string): boolean;
}

/**
 * Environment mixin — adds environment detection to any class.
 *
 * @param Base - The base class to extend
 * @returns A new class with environment helpers
 *
 * @example
 * ```typescript
 * class MyApp extends WithEnvironment(BaseClass) {
 *   boot() {
 *     if (this.isDevelopment) {
 *       console.log("Dev mode — extra logging enabled");
 *     }
 *   }
 * }
 * ```
 */
export function WithEnvironment<TBase extends Constructor>(Base: TBase) {
  return class EnvironmentMixin extends Base implements IEnvironmentAware {
    /**
     * Current environment name.
     *
     * Reads from `APP_ENV` or `NODE_ENV`. Defaults to `"production"`.
     *
     * @example
     * ```typescript
     * app.environment; // "development"
     * ```
     */
    public get environment(): string {
      return (Env.get("APP_ENV") ?? Env.get("NODE_ENV") ?? "production").toLowerCase();
    }

    /**
     * Whether the app is running in production.
     *
     * @example
     * ```typescript
     * if (app.isProduction) {
     *   // disable debug logging, enable caching
     * }
     * ```
     */
    public get isProduction(): boolean {
      return this.environment === "production";
    }

    /**
     * Whether the app is running in development or local.
     *
     * @example
     * ```typescript
     * if (app.isDevelopment) {
     *   // enable hot reload, verbose errors
     * }
     * ```
     */
    public get isDevelopment(): boolean {
      const env = this.environment;
      return env === "development" || env === "local" || env === "dev";
    }

    /**
     * Whether the app is running in a testing environment.
     *
     * @example
     * ```typescript
     * if (app.isTesting) {
     *   // use mock services, disable network calls
     * }
     * ```
     */
    public get isTesting(): boolean {
      const env = this.environment;
      return env === "testing" || env === "test";
    }

    /**
     * Whether the app is running in staging.
     *
     * @example
     * ```typescript
     * if (app.isStaging) {
     *   // enable feature flags for QA
     * }
     * ```
     */
    public get isStaging(): boolean {
      return this.environment === "staging";
    }

    /**
     * Whether debug mode is enabled.
     *
     * Reads from `DEBUG` env var. Also true in development.
     *
     * @example
     * ```typescript
     * if (app.isDebug) {
     *   // expose devtools, verbose logging
     * }
     * ```
     */
    public get isDebug(): boolean {
      return Env.boolean("DEBUG", false) || this.isDevelopment;
    }

    /**
     * Check if the current environment matches a given name.
     *
     * Case-insensitive comparison.
     *
     * @param name - Environment name to check
     * @returns `true` if the current environment matches
     *
     * @example
     * ```typescript
     * app.isEnvironment("staging"); // true/false
     * ```
     */
    public isEnvironment(name: string): boolean {
      return this.environment === name.toLowerCase();
    }
  };
}
