/**
 * defineConfig Utility
 *
 * Type-safe configuration helper for `ApplicationFactory.create()` options.
 * Follows the same `defineConfig` pattern used by Vite, Vitest, and other
 * modern tooling — the function is an identity function that exists purely
 * to provide IDE autocomplete and TypeScript inference on the config object.
 *
 * @module utils/define-config
 */

import type { ApplicationContextOptions } from "@/interfaces/application-context-options.interface";

/**
 * Define a type-safe application configuration object.
 *
 * This is a pure identity function — it returns the config as-is.
 * Its only purpose is to give TypeScript full type inference and IDE
 * autocomplete when writing the configuration outside of the
 * `ApplicationFactory.create()` call.
 *
 * @param config - The application options to validate and return
 * @returns The same config object, fully typed as `ApplicationContextOptions`
 *
 * @example
 * ```typescript
 * // container.config.ts
 * import { defineConfig } from '@stackra/ts-container';
 *
 * export default defineConfig({
 *   debug: import.meta.env.DEV,
 *   globalName: '__APP__',
 *   config: {
 *     apiUrl: import.meta.env.VITE_API_URL,
 *     featureFlags: {
 *       newCheckout: import.meta.env.VITE_FF_NEW_CHECKOUT === 'true',
 *     },
 *   },
 *   onReady: async (app: IApplicationContext) => {
 *     logger.info('ApplicationContext bootstrapped');
 *   },
 * });
 *
 * // main.ts
 * import { ApplicationFactory } from '@stackra/ts-container';
 * import containerConfig from './container.config';
 *
 * const app = await ApplicationFactory.create(AppModule, containerConfig);
 * ```
 */
export function defineConfig(config: ApplicationContextOptions): ApplicationContextOptions {
  return config;
}
