/**
 * BeforeApplicationShutdown Lifecycle Hook
 *
 * Called before the application begins its shutdown sequence.
 * This is the first shutdown hook, called before `onApplicationShutdown()`
 * and `onModuleDestroy()`.
 *
 * Use this hook for:
 * - Stopping incoming requests/connections
 * - Draining work queues
 * - Preparing for graceful shutdown
 *
 * @module interfaces/before-application-shutdown
 */

/**
 * Lifecycle hook called before application shutdown begins.
 *
 * Implement this interface on any provider that needs to prepare
 * for shutdown before the main shutdown sequence starts.
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
 * class WebSocketService implements BeforeApplicationShutdown {
 *   async beforeApplicationShutdown(signal?: string) {
 *     logger.info(`Preparing for shutdown (signal: ${signal})...`);
 *     await this.stopAcceptingConnections();
 *   }
 * }
 * ```
 */
export interface BeforeApplicationShutdown {
  /**
   * Called before application shutdown begins.
   *
   * Can be async — the application will wait for the promise to resolve
   * before proceeding to the next shutdown phase.
   *
   * @param signal - Optional shutdown signal (e.g., 'SIGTERM', 'SIGINT')
   * @returns void or a Promise that resolves when preparation is complete
   */
  beforeApplicationShutdown(signal?: string): void | Promise<void>;
}
