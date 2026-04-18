/**
 * IApplication Interface
 *
 * Defines the public API of the bootstrapped Application. Extends
 * `ContainerResolver` with additional methods for module selection,
 * container access, and graceful shutdown.
 *
 * ## Why an interface?
 *
 * - Enables mocking in tests without importing the concrete class
 * - Documents the public API contract clearly
 * - Allows alternative implementations (e.g., a test context, a lazy context)
 *
 * @module interfaces/application
 */

import type { Type } from './type.interface';
import type { InjectionToken } from './injection-token.interface';
import type { ContainerResolver } from './container-resolver.interface';
import type { NestContainer } from '@/injector/container';

/**
 * The public API of a bootstrapped application context.
 *
 * Extends `ContainerResolver` with:
 * - `select()` — resolve from a specific module
 * - `getContainer()` — access the raw container
 * - `close()` — graceful shutdown with lifecycle hooks
 *
 * @example
 * ```typescript
 * // Type your variable as the interface for testability
 * let app: IApplication;
 *
 * beforeAll(async () => {
 *   app = await Application.create(AppModule);
 * });
 *
 * afterAll(async () => {
 *   await app.close();
 * });
 *
 * test('resolves UserService', () => {
 *   const userService = app.get(UserService);
 *   expect(userService).toBeDefined();
 * });
 * ```
 */
export interface IApplication extends ContainerResolver {
  /**
   * Resolve a provider by its injection token.
   *
   * Searches all modules for the provider. For singleton providers,
   * returns the cached instance.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token (class, string, or symbol)
   * @returns The resolved provider instance
   * @throws Error if the provider is not found
   */
  get<T = any>(token: InjectionToken<T>): T;

  /**
   * Try to resolve a provider, returning `undefined` if not found.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param token - The injection token
   * @returns The resolved instance or `undefined`
   */
  getOptional<T = any>(token: InjectionToken<T>): T | undefined;

  /**
   * Check if a provider is registered in any module.
   *
   * @param token - The injection token to check
   * @returns `true` if a provider is registered for this token
   */
  has(token: InjectionToken): boolean;

  /**
   * Select a specific module and resolve a provider from it.
   *
   * Useful when the same token exists in multiple modules and you
   * need to specify which one to resolve from.
   *
   * @typeParam T - The expected type of the resolved instance
   * @param moduleClass - The module class to search in
   * @param token - The injection token
   * @returns The resolved provider instance
   *
   * @throws Error if the module or provider is not found
   *
   * @example
   * ```typescript
   * const cache = app.select(CacheModule, CacheManager);
   * ```
   */
  select<T = any>(moduleClass: Type<any>, token: InjectionToken<T>): T;

  /**
   * Get the underlying NestContainer.
   *
   * For advanced use cases like inspecting the module graph,
   * accessing raw InstanceWrappers, or building dev tools.
   *
   * @returns The `NestContainer` instance
   */
  getContainer(): NestContainer;

  /**
   * Gracefully shut down the application.
   *
   * Calls `onModuleDestroy()` on all providers that implement it,
   * in reverse module order (leaf modules first, root module last).
   * After calling `close()`, the context is no longer usable.
   *
   * @returns A Promise that resolves when all destroy hooks have completed
   *
   * @example
   * ```typescript
   * window.addEventListener('beforeunload', () => {
   *   app.close();
   * });
   * ```
   */
  close(): Promise<void>;
}
