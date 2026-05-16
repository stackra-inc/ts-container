/**
 * hasOnModuleInit Type Guard
 *
 * Checks if an object implements the `IOnModuleInit` interface.
 * Used by the `InstanceLoader` to determine which providers need their
 * `onModuleInit()` hook called after instantiation.
 *
 * @module utils/has-on-module-init
 */

import type { IOnModuleInit } from "@/interfaces/on-module-init.interface";

/**
 * Type guard that checks if an object implements the `IOnModuleInit` interface.
 *
 * @param instance - The object to check, typically a resolved provider instance
 * @returns `true` if the instance has an `onModuleInit` method
 *
 * @example
 * ```typescript
 * if (hasOnModuleInit(wrapper.instance)) {
 *   await wrapper.instance.onModuleInit();
 * }
 * ```
 */
export function hasOnModuleInit(instance: unknown): instance is IOnModuleInit {
  return instance != null && typeof (instance as IOnModuleInit).onModuleInit === "function";
}
