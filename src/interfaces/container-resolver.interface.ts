/**
 * ContainerResolver Interface
 *
 * Minimal interface for resolving providers from a DI container.
 * This is the contract that any DI resolver must implement. It's used by:
 * - `@stackra/ts-container/react` (ContainerProvider accepts this)
 * - `@stackra/application` (ApplicationContext implements this)
 * - Any custom resolver or testing mock
 *
 * By depending on this interface instead of a concrete class, consumers
 * stay decoupled from the bootstrap implementation.
 *
 * @module interfaces/container-resolver
 */

import type { InjectionToken } from "./injection-token.interface";

/**
 * Minimal interface for resolving providers from a DI container.
 *
 * Any object that can look up providers by token can implement this.
 * The React hooks (`useInject`, etc.) depend on this interface,
 * not on the concrete `ApplicationContext`.
 *
 * @example
 * ```typescript
 * // ApplicationContext implements this
 * const app: ContainerResolver = await ApplicationContext.create(AppModule);
 * const service = app.get(UserService);
 *
 * // You can also create a mock for testing
 * const mock: ContainerResolver = {
 *   get: (token) => mockInstances.get(token),
 *   getOptional: (token) => mockInstances.get(token),
 *   has: (token) => mockInstances.has(token),
 * };
 * ```
 */
export interface ContainerResolver {
  /**
   * Resolve a provider by its injection token.
   *
   * Looks up the provider in the container and returns the resolved instance.
   * Throws if the provider is not registered or cannot be resolved.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token (class, string, or symbol)
   * @returns The resolved provider instance
   * @throws Error if the provider is not found or resolution fails
   *
   * @example
   * ```typescript
   * const userService = container.get(UserService);
   * const apiUrl = container.get<string>('API_URL');
   * ```
   */
  get<T = any>(token: InjectionToken<T>): T;

  /**
   * Try to resolve a provider, returning `undefined` if not found.
   *
   * Unlike `get()`, this method does not throw when the provider
   * is missing. Useful for optional dependencies or feature detection.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token
   * @returns The resolved instance, or `undefined` if not found
   *
   * @example
   * ```typescript
   * const analytics = container.getOptional(AnalyticsService);
   * if (analytics) {
   *   analytics.track('page_view');
   * }
   * ```
   */
  getOptional<T = any>(token: InjectionToken<T>): T | undefined;

  /**
   * Check if a provider is registered in the container.
   *
   * Does not trigger resolution — only checks for the existence
   * of a binding for the given token.
   *
   * @param token - The injection token to check
   * @returns `true` if a provider is registered for this token
   *
   * @example
   * ```typescript
   * if (container.has(RedisManager)) {
   *   // Redis is available, use it
   * } else {
   *   // Fall back to in-memory cache
   * }
   * ```
   */
  has(token: InjectionToken): boolean;
}
