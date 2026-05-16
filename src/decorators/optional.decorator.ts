/**
 * @Optional() Decorator
 *
 * Marks a dependency as optional. If the container cannot resolve the
 * dependency, `undefined` is injected instead of throwing an error.
 *
 * For constructor parameters, stores the parameter index in `optional:paramtypes`.
 * For class properties, stores the property key in `optional:properties_metadata`.
 *
 * All metadata reads and writes go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module decorators/optional
 */

import { updateMetadata } from "@vivtel/metadata";

import { OPTIONAL_DEPS_METADATA, OPTIONAL_PROPERTY_DEPS_METADATA } from "@/constants";

/**
 * Marks a constructor parameter or property dependency as optional.
 *
 * Without `@Optional()`, an unresolvable dependency throws an error.
 * With `@Optional()`, `undefined` is injected instead, allowing the
 * provider to gracefully handle missing dependencies.
 *
 * For constructor parameters, the parameter index is appended to the
 * `optional:paramtypes` metadata array. For properties, the property
 * key is appended to `optional:properties_metadata`.
 *
 * @returns A combined `PropertyDecorator & ParameterDecorator` that marks
 *   the target dependency as optional
 *
 * @example
 * ```typescript
 * @Injectable()
 * class CacheService {
 *   constructor(
 *     @Inject(CACHE_CONFIG) private config: CacheConfig,
 *     @Optional() @Inject(RedisManager) private redis?: RedisManager,
 *   ) {
 *     // redis will be undefined if RedisModule is not imported
 *   }
 * }
 * ```
 */
export function Optional(): PropertyDecorator & ParameterDecorator {
  return (target: object, key: string | symbol | undefined, index?: number) => {
    if (index !== undefined) {
      // Constructor parameter — append the index to optional:paramtypes.
      // updateMetadata handles read-default-transform-write in one call.
      updateMetadata(
        OPTIONAL_DEPS_METADATA,
        [] as number[],
        (indices) => [...indices, index],
        target,
      );
    } else {
      // Property — append the property key to optional:properties_metadata.
      // key is always defined in the property decorator branch (index is undefined here).
      updateMetadata(
        OPTIONAL_PROPERTY_DEPS_METADATA,
        [] as Array<string | symbol>,
        (keys) => [...keys, key as string | symbol],
        target.constructor as object,
      );
    }
  };
}
