/**
 * hasOnModuleDestroy Type Guard
 *
 * Checks if an object implements the `OnModuleDestroy` interface.
 * Used by the `InstanceLoader` to determine which providers need their
 * `onModuleDestroy()` hook called during shutdown.
 *
 * @module utils/has-on-module-destroy
 */

import type { OnModuleDestroy } from "@/interfaces/on-module-destroy.interface";

/**
 * Type guard that checks if an object implements the `OnModuleDestroy` interface.
 *
 * @param instance - The object to check, typically a resolved provider instance
 * @returns `true` if the instance has an `onModuleDestroy` method
 *
 * @example
 * ```typescript
 * if (hasOnModuleDestroy(wrapper.instance)) {
 *   await wrapper.instance.onModuleDestroy();
 * }
 * ```
 */
export function hasOnModuleDestroy(instance: unknown): instance is OnModuleDestroy {
  return instance != null && typeof (instance as OnModuleDestroy).onModuleDestroy === "function";
}
