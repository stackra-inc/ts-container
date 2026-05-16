/**
 * forwardRef Utility
 *
 * Resolves circular module dependencies by wrapping a class reference
 * in a lazy function that is evaluated after all modules are defined.
 *
 * @module utils/forward-ref
 */

import type { ForwardReference } from "@/interfaces/forward-reference.interface";

/**
 * Creates a forward reference to break circular dependency chains.
 *
 * When two modules import each other, TypeScript may resolve one of them
 * as `undefined` due to the ES module evaluation order. `forwardRef()`
 * wraps the reference in a function that's called later, after both
 * modules have been fully defined.
 *
 * The returned `ForwardReference` object is recognized by the scanner
 * and `@Inject()` decorator, which call `forwardRef()` to unwrap the
 * actual class reference at resolution time.
 *
 * @typeParam T - The type of the referenced class or value
 * @param fn - A function that returns the class reference. Called lazily
 *   during scanning or injection, not at decoration time.
 * @returns A `ForwardReference<T>` object containing the lazy resolver function
 *
 * @example
 * ```typescript
 * // cats.module.ts
 * @Module({
 *   imports: [forwardRef(() => DogsModule)],
 * })
 * class CatsModule {}
 *
 * // dogs.module.ts
 * @Module({
 *   imports: [forwardRef(() => CatsModule)],
 * })
 * class DogsModule {}
 * ```
 */
export function forwardRef<T = any>(fn: () => T): ForwardReference<T> {
  return { forwardRef: fn };
}
