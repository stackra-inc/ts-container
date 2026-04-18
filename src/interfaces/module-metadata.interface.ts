/**
 * Module Metadata Interface
 *
 * Defines the shape of the configuration object passed to the `@Module()`
 * decorator. This is the primary way to declare a module's dependency graph.
 *
 * @module interfaces/module-metadata
 */

import type { Type } from './type.interface';
import type { Provider } from './provider.interface';
import type { DynamicModule } from './dynamic-module.interface';
import type { ForwardReference } from './forward-reference.interface';
import type { InjectionToken } from './injection-token.interface';

/**
 * Configuration object passed to the `@Module()` decorator.
 *
 * Defines the module's dependency graph: what it imports, provides, and exports.
 * All properties are optional — an empty `@Module({})` is valid for modules
 * that only serve as configuration entry points (e.g., with `forRoot()`).
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [ConfigModule, RedisModule.forRoot(config)],
 *   providers: [
 *     UserService,
 *     { provide: CACHE_CONFIG, useValue: cacheConfig },
 *   ],
 *   exports: [UserService],
 * })
 * class UserModule {}
 * ```
 */
export interface ModuleMetadata {
  /**
   * Modules to import.
   *
   * Imported modules make their exported providers available to this module.
   * Can be static module classes, dynamic modules (from `forRoot()`),
   * async dynamic modules (Promise), or forward references (for circular deps).
   *
   * @default []
   */
  imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;

  /**
   * Providers to register in this module.
   *
   * These providers are available for injection within this module.
   * To make them available to other modules, add them to `exports`.
   * Supports class shorthand, class providers, value providers,
   * factory providers, and existing (alias) providers.
   *
   * @default []
   */
  providers?: Provider[];

  /**
   * Providers or modules to export.
   *
   * Exported providers become available to modules that import this module.
   * You can export:
   * - Provider tokens (class, string, symbol)
   * - Entire modules (re-exporting their exports)
   * - Custom provider objects
   * - Forward references
   *
   * @default []
   */
  exports?: Array<InjectionToken | Provider | DynamicModule | ForwardReference>;

  /**
   * Entry providers that should be instantiated immediately on bootstrap,
   * even if not injected anywhere.
   *
   * Useful for providers that need to run side effects on startup:
   * - Event listeners
   * - Background timers
   * - Analytics initialization
   * - WebSocket connections
   *
   * Entry providers are resolved after all regular providers but before
   * `onModuleInit()` lifecycle hooks are called.
   *
   * @default []
   *
   * @example
   * ```typescript
   * @Module({
   *   providers: [AnalyticsService, EventBusService],
   *   entryProviders: [AnalyticsService, EventBusService],
   * })
   * class AppModule {}
   * ```
   */
  entryProviders?: Provider[];
}
