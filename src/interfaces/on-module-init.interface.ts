/**
 * OnModuleInit Lifecycle Interface
 *
 * Implement this interface on a provider to receive a callback after
 * the module's providers have been instantiated.
 *
 * @module @stackra/ts-container/interfaces
 */

/**
 * Called once the host module's providers have been instantiated.
 * Use for initialization logic that depends on injected services.
 */
export interface OnModuleInit {
  onModuleInit(): void | Promise<void>;
}

/** Alias for backward compatibility. */
export type IOnModuleInit = OnModuleInit;
