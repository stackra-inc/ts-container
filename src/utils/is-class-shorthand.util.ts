/**
 * isClassShorthand Type Guard
 *
 * Determines whether a provider is a class shorthand — a plain class
 * constructor used as both the injection token and the implementation.
 *
 * @module utils/is-class-shorthand
 */

import type { Type } from "@/types/type.type";
import type { Provider } from "@/interfaces/provider.interface";

/**
 * Check if a provider is a class shorthand (just a class reference).
 *
 * Class shorthand is the simplest provider form — the class itself serves
 * as both the injection token and the implementation.
 *
 * @param provider - The provider to check
 * @returns `true` if the provider is a function (class constructor)
 *
 * @example
 * ```typescript
 * isClassShorthand(UserService);                              // true
 * isClassShorthand({ provide: UserService, useClass: UserService }); // false
 * ```
 */
export function isClassShorthand(provider: Provider): provider is Type {
  return typeof provider === "function";
}
