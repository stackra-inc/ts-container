/**
 * ModuleMetatype Type
 *
 * The type of a module definition — can be a class, dynamic module, or promise.
 * Used as the input type for `addModule()` and `scanForModules()`.
 *
 * @module interfaces/module-metatype
 */

import type { Type } from './type.interface';
import type { DynamicModule } from './dynamic-module.interface';

/**
 * The type of a module definition — can be a class, dynamic module, or promise.
 *
 * The container normalizes all forms into a `Module` instance during
 * registration. Async dynamic modules (promises) are awaited before
 * metadata extraction.
 *
 * @example
 * ```typescript
 * // Static module class
 * const mod1: ModuleMetatype = AppModule;
 *
 * // Dynamic module object
 * const mod2: ModuleMetatype = CacheModule.forRoot(config);
 *
 * // Async dynamic module
 * const mod3: ModuleMetatype = import('./lazy.module').then(m => m.LazyModule.forRoot());
 * ```
 */
export type ModuleMetatype = Type<any> | DynamicModule | Promise<DynamicModule>;
