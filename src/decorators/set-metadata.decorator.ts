/**
 * @SetMetadata() Decorator
 *
 * A generic metadata decorator that attaches arbitrary key-value pairs
 * to classes or methods. Used by guards, interceptors, and any code
 * that needs to read decorator metadata at runtime via `Reflector`.
 *
 * This is the low-level building block. For discoverable decorators
 * (that also register with the discovery index), use
 * `DiscoveryService.createDecorator()` instead.
 *
 * ## Usage
 *
 * ```typescript
 * import { SetMetadata } from '@stackra/ts-container';
 *
 * // Create a typed decorator
 * const Roles = (...roles: string[]) => SetMetadata('roles', roles);
 * const Public = () => SetMetadata('isPublic', true);
 *
 * @Injectable()
 * class UserController {
 *   @Roles('admin')
 *   @Public()
 *   getUsers() { ... }
 * }
 * ```
 *
 * All metadata writes go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module decorators/set-metadata
 */

import { defineMetadata } from "@vivtel/metadata";

/**
 * Attach metadata to a class or method.
 *
 * Returns a decorator that can be applied to both classes and methods.
 * The metadata is readable via `Reflector.get(key, target)` or
 * `Reflect.getMetadata(key, target)`.
 *
 * @typeParam K - The metadata key type (typically `string`)
 * @typeParam V - The metadata value type
 * @param metadataKey - The key under which to store the metadata
 * @param metadataValue - The value to store
 * @returns A `ClassDecorator & MethodDecorator` that writes the metadata
 *
 * @example
 * ```typescript
 * // Simple boolean flag
 * const Public = () => SetMetadata('isPublic', true);
 *
 * // Array of values
 * const Roles = (...roles: string[]) => SetMetadata('roles', roles);
 *
 * // Object metadata
 * const CacheTTL = (ttl: number) => SetMetadata('cache', { ttl });
 *
 * @Public()
 * @Roles('admin', 'moderator')
 * @CacheTTL(300)
 * class AdminController {}
 * ```
 */
export function SetMetadata<K extends string, V>(
  metadataKey: K,
  metadataValue: V,
): ClassDecorator & MethodDecorator {
  return (
    target: object | Function,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): any => {
    if (descriptor && propertyKey !== undefined) {
      // Method-level — write metadata onto the method function
      defineMetadata(metadataKey, metadataValue, descriptor.value as object);
      return descriptor;
    }
    // Class-level — write metadata onto the constructor
    defineMetadata(metadataKey, metadataValue, target as object);
    return target;
  };
}
