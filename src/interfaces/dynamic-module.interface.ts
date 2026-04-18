/**
 * Dynamic Module Interface
 *
 * Dynamic modules are the mechanism for creating configurable, reusable modules.
 * They're returned by static methods like `forRoot()` and `forFeature()`.
 *
 * When the scanner encounters a `DynamicModule` in an imports array, it:
 * 1. Uses the `module` property to identify the module class
 * 2. Merges the dynamic metadata (providers, imports, exports) with
 *    any static metadata from the `@Module()` decorator
 * 3. Registers everything into the container
 *
 * @module interfaces/dynamic-module
 */

import type { Type } from './type.interface';
import type { ModuleMetadata } from './module-metadata.interface';

/**
 * A module configuration object returned by `forRoot()`, `forFeature()`, etc.
 *
 * Extends `ModuleMetadata` with a `module` property that references the
 * module class, and an optional `global` flag. The scanner merges this
 * dynamic metadata with any static `@Module()` metadata on the class.
 *
 * @example
 * ```typescript
 * @Module({})
 * class CacheModule {
 *   static forRoot(config: CacheConfig): DynamicModule {
 *     return {
 *       module: CacheModule,
 *       global: true,
 *       providers: [
 *         { provide: CACHE_CONFIG, useValue: config },
 *         CacheManager,
 *       ],
 *       exports: [CacheManager],
 *     };
 *   }
 * }
 *
 * // Usage:
 * @Module({
 *   imports: [CacheModule.forRoot({ default: 'memory' })],
 * })
 * class AppModule {}
 * ```
 */
export interface DynamicModule extends ModuleMetadata {
  /**
   * The module class this dynamic configuration belongs to.
   *
   * This is how the scanner identifies which module to configure.
   * The class should be decorated with `@Module()` (even if empty).
   */
  module: Type<any>;

  /**
   * When `true`, this module's exported providers are available globally
   * to all other modules without explicit imports.
   *
   * Equivalent to applying the `@Global()` decorator on the module class,
   * but configured per-registration (useful when the same module is
   * sometimes global and sometimes not).
   *
   * @default false
   */
  global?: boolean;
}
