/**
 * @Global() Decorator
 *
 * Makes a module's exported providers available globally to all other
 * modules without requiring explicit imports.
 *
 * Internally sets the `__module:global__` metadata key to `true` on the
 * target class. The scanner reads this during module registration to
 * add the module to the global modules set.
 *
 * All metadata writes go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module decorators/global
 */

import { defineMetadata } from "@vivtel/metadata";

import { GLOBAL_MODULE_METADATA } from "@/constants";

/**
 * Marks a module as global-scoped.
 *
 * Once a global module is imported anywhere (typically in the root module),
 * its exported providers become available to ALL modules in the application
 * without needing to import the module explicitly.
 *
 * Use sparingly — global modules reduce explicitness. Good candidates:
 * - Configuration modules
 * - Logger modules
 * - Database connection modules
 *
 * @returns A `ClassDecorator` that sets the global metadata flag on the target
 *
 * @example
 * ```typescript
 * @Global()
 * @Module({
 *   providers: [ConfigService],
 *   exports: [ConfigService],
 * })
 * class ConfigModule {
 *   static forRoot(config: AppConfig): DynamicModule {
 *     return {
 *       module: ConfigModule,
 *       global: true, // Can also be set here instead of @Global()
 *       providers: [{ provide: APP_CONFIG, useValue: config }, ConfigService],
 *       exports: [ConfigService],
 *     };
 *   }
 * }
 * ```
 */
export function Global(): ClassDecorator {
  return (target: object) => {
    defineMetadata(GLOBAL_MODULE_METADATA, true, target);
  };
}
