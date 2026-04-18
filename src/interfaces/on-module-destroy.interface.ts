/**
 * OnModuleDestroy Lifecycle Interface
 *
 * Providers can implement this interface to hook into the application
 * shutdown lifecycle. Called when the application is shutting down,
 * in reverse module order (leaf modules first, root last).
 *
 * @module interfaces/on-module-destroy
 */

/**
 * Interface for providers that need cleanup before shutdown.
 *
 * `onModuleDestroy()` is called when the application is shutting down.
 * Use this to close connections, flush buffers, and release resources.
 * Modules are destroyed in reverse order (leaf modules first, root last).
 *
 * @example
 * ```typescript
 * @Injectable()
 * class RedisManager implements OnModuleDestroy {
 *   async onModuleDestroy() {
 *     await this.disconnectAll();
 *   }
 * }
 * ```
 */
export interface OnModuleDestroy {
  /**
   * Called during application shutdown before provider references are released.
   *
   * Can be synchronous or asynchronous. If async, the container
   * awaits completion before proceeding to the next provider.
   *
   * @returns Void or a Promise that resolves when cleanup is complete
   */
  onModuleDestroy(): any | Promise<any>;
}

/**
 * Type guard that checks if an object implements the `OnModuleDestroy` interface.
 *
 * Used by the `InstanceLoader` to determine which providers need their
 * `onModuleDestroy()` hook called during shutdown.
 *
 * @param instance - The object to check, typically a resolved provider instance
 * @returns `true` if the instance has an `onModuleDestroy` method
 *
 * @example
 * ```typescript
 * if (hasOnModuleDestroy(wrapper.instance)) {
 *   await wrapper.instance.onModuleDestroy();
 * }
 * ```
 */
export function hasOnModuleDestroy(instance: any): instance is OnModuleDestroy {
  return instance && typeof instance.onModuleDestroy === 'function';
}
