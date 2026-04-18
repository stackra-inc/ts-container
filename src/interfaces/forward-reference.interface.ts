/**
 * Forward Reference Interface
 *
 * Wraps a class reference in a lazy function to break circular dependency
 * chains in the module graph. Created by the `forwardRef()` utility.
 *
 * @module interfaces/forward-reference
 */

/**
 * A forward reference wraps a class reference in a function to break
 * circular dependency chains in the module graph.
 *
 * The `forwardRef` property is a function that returns the actual class
 * reference. It's called lazily by the scanner and `@Inject()` decorator
 * after all modules have been defined.
 *
 * @typeParam T - The type of the referenced class or value
 *
 * @example
 * ```typescript
 * import { forwardRef } from '@stackra/ts-container';
 *
 * @Module({
 *   imports: [forwardRef(() => CatsModule)],
 * })
 * class DogsModule {}
 * ```
 */
export interface ForwardReference<T = any> {
  /**
   * Lazy resolver function that returns the actual class reference.
   *
   * Called by the scanner during module graph traversal and by the
   * `@Inject()` decorator during metadata processing.
   *
   * @returns The actual class reference or value
   */
  forwardRef: () => T;
}
