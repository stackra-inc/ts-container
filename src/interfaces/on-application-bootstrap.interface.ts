/**
 * OnApplicationBootstrap Lifecycle Interface
 *
 * Implement this interface on a provider to receive a callback after
 * all modules have been initialized (after all onModuleInit calls).
 *
 * @module @stackra/ts-container/interfaces
 */

/**
 * Called after all modules have been initialized.
 * Use for cross-module setup that requires all services to be ready.
 */
export interface OnApplicationBootstrap {
  onApplicationBootstrap(): void | Promise<void>;
}

/** Alias for backward compatibility. */
export type IOnApplicationBootstrap = OnApplicationBootstrap;
