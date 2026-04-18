/**
 * Type Interface
 *
 * Represents a class constructor — the fundamental type used throughout
 * the DI system to represent classes that can be instantiated with `new`.
 *
 * @module interfaces/type
 */

/**
 * Represents a class constructor (a "newable" type).
 *
 * Used as the type for:
 * - Provider metatypes (the class to instantiate)
 * - Injection tokens (when using class-based tokens)
 * - Module classes
 *
 * Extends `Function` to ensure the value is callable, and adds the
 * `new` signature to indicate it can be used with the `new` operator.
 *
 * @typeParam T - The instance type that the constructor creates
 *
 * @example
 * ```typescript
 * // Any class satisfies Type<T>
 * class UserService {}
 * const type: Type<UserService> = UserService;
 *
 * // Can be used to create instances dynamically
 * function createInstance<T>(type: Type<T>, ...args: any[]): T {
 *   return new type(...args);
 * }
 * ```
 */
export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}
