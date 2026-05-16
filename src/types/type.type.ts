/**
 * Type — Utility Type
 *
 * Represents any class constructor that can be instantiated with `new`.
 * Used extensively throughout the DI container for provider registration,
 * module definitions, and injection token typing.
 *
 * @module types/type
 */

/**
 * A class constructor type.
 *
 * Represents any class that can be instantiated with `new`.
 * The generic parameter `T` is the instance type produced by the constructor.
 *
 * @typeParam T - The instance type produced by the constructor
 *
 * @example
 * ```typescript
 * function createInstance<T>(cls: Type<T>): T {
 *   return new cls();
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Type<T = any> = new (...args: any[]) => T;
