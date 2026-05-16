/**
 * Reflector — Typed Metadata Reader
 *
 * Mirrors NestJS's `Reflector` — a lightweight injectable service that
 * provides typed access to metadata set by decorators. Used by guards,
 * interceptors, and any code that needs to read decorator metadata at
 * runtime without calling `Reflect.getMetadata` directly.
 *
 * ## Why use Reflector instead of raw Reflect?
 *
 * 1. **Type safety** — generic methods infer the return type
 * 2. **Consistent API** — one place to read class, method, and param metadata
 * 3. **Testable** — injectable, so you can mock it in tests
 * 4. **Aggregation** — `getAllAndMerge` and `getAllAndOverride` combine
 *    metadata from multiple levels (method + class)
 *
 * ## Usage
 *
 * ```typescript
 * @Injectable()
 * class RolesGuard {
 *   constructor(private readonly reflector: Reflector) {}
 *
 *   canActivate(context: ExecutionContext): boolean {
 *     const roles = this.reflector.getAllAndOverride<string[]>('roles', [
 *       context.getHandler(),
 *       context.getClass(),
 *     ]);
 *     if (!roles) return true;
 *     return roles.some(role => currentUser.roles.includes(role));
 *   }
 * }
 * ```
 *
 * @module services/reflector
 */

import { getMetadata } from "@vivtel/metadata";

import { Injectable } from "@/decorators/injectable.decorator";

/**
 * Injectable metadata reader.
 *
 * Provides typed access to metadata set by decorators on classes,
 * methods, and parameters. Registered automatically in every module
 * (or import `DiscoveryModule` which provides it).
 *
 * @example
 * ```typescript
 * @Injectable()
 * class PermissionChecker {
 *   constructor(private readonly reflector: Reflector) {}
 *
 *   getPermissions(handler: Function): string[] {
 *     return this.reflector.get<string[]>('permissions', handler) ?? [];
 *   }
 * }
 * ```
 */
@Injectable()
export class Reflector {
  /**
   * Read metadata from a single target (class or method).
   *
   * @typeParam T - The expected metadata type
   * @param metadataKey - The metadata key to read
   * @param target - The class constructor or method function
   * @returns The metadata value, or `undefined` if not set
   *
   * @example
   * ```typescript
   * const roles = reflector.get<string[]>('roles', handler);
   * ```
   */
  public get<T = any>(metadataKey: string, target: object): T | undefined {
    return getMetadata<T>(metadataKey, target);
  }

  /**
   * Read metadata from multiple targets and return the first non-undefined value.
   *
   * Useful for the "method overrides class" pattern — check the method
   * first, fall back to the class. The first target that has the metadata
   * wins.
   *
   * @typeParam T - The expected metadata type
   * @param metadataKey - The metadata key to read
   * @param targets - Array of targets to check in order (first match wins)
   * @returns The first non-undefined metadata value, or `undefined`
   *
   * @example
   * ```typescript
   * // Method-level @Roles(['admin']) overrides class-level @Roles(['user'])
   * const roles = reflector.getAllAndOverride<string[]>('roles', [
   *   handler,       // method — checked first
   *   controller,    // class — fallback
   * ]);
   * ```
   */
  public getAllAndOverride<T = any>(metadataKey: string, targets: object[]): T | undefined {
    for (const target of targets) {
      const result = getMetadata<T>(metadataKey, target);
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  }

  /**
   * Read metadata from multiple targets and merge all values into a flat array.
   *
   * Useful for the "accumulate from all levels" pattern — collect roles
   * from both the method and the class, then check if the user has any.
   *
   * @typeParam T - The expected metadata item type
   * @param metadataKey - The metadata key to read
   * @param targets - Array of targets to read from
   * @returns A flat array of all metadata values found (empty if none)
   *
   * @example
   * ```typescript
   * // Class has @Roles(['user']), method has @Roles(['admin'])
   * const allRoles = reflector.getAllAndMerge<string>('roles', [
   *   handler,
   *   controller,
   * ]);
   * // → ['admin', 'user']
   * ```
   */
  public getAllAndMerge<T = any>(metadataKey: string, targets: object[]): T[] {
    const result: T[] = [];
    for (const target of targets) {
      const value = getMetadata<T | T[]>(metadataKey, target);
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        result.push(...value);
      } else {
        result.push(value);
      }
    }
    return result;
  }
}
