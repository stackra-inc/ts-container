/**
 * ModuleInput — Type.
 *
 * @module @stackra/container/types
 */

import type { Type } from "./type.type";

/**
 * Input type for the root module.
 *
 * Accepts either a direct class reference or a factory function that
 * returns a promise resolving to the class. The factory form enables
 * dynamic imports for deferred module loading (e.g., waiting for env()
 * to be available before the module is evaluated).
 *
 * @example
 * ```typescript
 * // Direct class reference
 * ApplicationFactory.builder(AppModule)
 *
 * // Factory function with dynamic import
 * ApplicationFactory.builder(() => import('@/lib/app.module').then(m => m.AppModule))
 * ```
 */
export type ModuleInput = Type<any> | (() => Promise<Type<any>>);
