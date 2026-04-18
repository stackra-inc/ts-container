/**
 * OnApplicationBootstrap Lifecycle Hook
 *
 * Called after all `onModuleInit()` hooks have completed across all modules.
 * This is the final initialization hook before the application is considered
 * fully bootstrapped and ready to use.
 *
 * Use this hook for:
 * - Final application-wide setup that depends on all modules being initialized
 * - Starting background services that need the full DI graph
 * - Logging that the application is ready
 *
 * @module interfaces/on-application-bootstrap
 */

/**
 * Lifecycle hook called after all modules have been initialized.
 *
 * Implement this interface on any provider that needs to run logic
 * after the entire application has been bootstrapped.
 *
 * Execution order:
 * 1. All providers instantiated
 * 2. All `onModuleInit()` hooks called (per module, breadth-first)
 * 3. All `onApplicationBootstrap()` hooks called (per module, breadth-first)
 * 4. Application is ready
 *
 * @example
 * ```typescript
 * @Injectable()
 * class BackgroundJobService implements OnApplicationBootstrap {
 *   async onApplicationBootstrap() {
 *     console.log('Starting background jobs...');
 *     await this.startJobQueue();
 *   }
 * }
 * ```
 */
export interface OnApplicationBootstrap {
  /**
   * Called after all modules have been initialized.
   *
   * Can be async — the application will wait for the promise to resolve
   * before considering bootstrap complete.
   *
   * @returns void or a Promise that resolves when bootstrap logic is complete
   */
  onApplicationBootstrap(): void | Promise<void>;
}
