/**
 * OnApplicationShutdown Lifecycle Hook
 *
 * Called during application shutdown, after `beforeApplicationShutdown()`
 * but before `onModuleDestroy()`.
 *
 * Use this hook for:
 * - Closing external connections (databases, message queues)
 * - Flushing buffers
 * - Saving state
 *
 * @module interfaces/on-application-shutdown
 */

/**
 * Lifecycle hook called during application shutdown.
 *
 * Implement this interface on any provider that needs to perform
 * cleanup during the main shutdown phase.
 *
 * Execution order (on `app.close()`):
 * 1. All `beforeApplicationShutdown()` hooks called (reverse module order)
 * 2. All `onApplicationShutdown()` hooks called (reverse module order)
 * 3. All `onModuleDestroy()` hooks called (reverse module order)
 * 4. ApplicationContext is closed
 *
 * @example
 * ```typescript
 * @Injectable()
 * class DatabaseService implements OnApplicationShutdown {
 *   async onApplicationShutdown(signal?: string) {
 *     logger.info(`Closing database connection (signal: ${signal})...`);
 *     await this.connection.close();
 *   }
 * }
 * ```
 */
export interface OnApplicationShutdown {
  /**
   * Called during application shutdown.
   *
   * Can be async — the application will wait for the promise to resolve
   * before proceeding to the next shutdown phase.
   *
   * @param signal - Optional shutdown signal (e.g., 'SIGTERM', 'SIGINT')
   * @returns void or a Promise that resolves when shutdown logic is complete
   */
  onApplicationShutdown(signal?: string): void | Promise<void>;
}
