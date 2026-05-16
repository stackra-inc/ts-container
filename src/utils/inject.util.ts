/**
 * inject() — Lazy DI resolution for module-level constants.
 *
 * Creates a typed Proxy that lazily resolves a service from the DI
 * container on first property access. Safe to use at module scope
 * before the application bootstraps.
 *
 * This replaces the `inject()` pattern with a simpler function call.
 *
 * ## How it works:
 *
 * 1. Returns a Proxy immediately (no DI resolution yet)
 * 2. On first property/method access, resolves from the container
 * 3. Caches the resolved instance for subsequent accesses
 * 4. Binds methods to the instance so `this` works correctly
 *
 * ## Usage:
 *
 * ```typescript
 * import { inject } from "@stackra/ts-container";
 *
 * export const log: LoggerManager = inject(LoggerManager);
 * export const cache: CacheManager = inject(CACHE_MANAGER);
 * export const auth: AuthService = inject(AUTH_SERVICE);
 *
 * // Use anywhere after bootstrap:
 * logger.info("hello");
 * cache.store().get("key");
 * auth.login(params);
 * ```
 *
 * ## Testing:
 *
 * ```typescript
 * import { inject } from "@stackra/ts-container";
 *
 * // Swap the resolved instance
 * inject.swap(LoggerManager, mockLogger);
 *
 * // Clear all cached instances
 * inject.clearAll();
 * ```
 *
 * @module @stackra/ts-container
 * @category DI
 */

import { getGlobalApplicationContext } from "@/utils/global-application.util";
import type { InjectionToken } from "@/interfaces/injection-token.interface";

/**
 * Cache of resolved instances, keyed by token string.
 */
const resolvedInstances = new Map<string, any>();

/**
 * Convert an injection token to a string key for caching.
 *
 * @param token - The injection token.
 * @returns A string key.
 */
function getTokenKey(token: InjectionToken): string {
  if (typeof token === "function") return token.name;
  if (typeof token === "symbol") return token.toString();
  return String(token);
}

/**
 * Create a lazy DI proxy for a service.
 *
 * Returns a Proxy typed as `T` that resolves the service from the
 * DI container on first property access. The resolved instance is
 * cached for subsequent accesses.
 *
 * @typeParam T - The type of the service.
 * @param token - The injection token (class, symbol, or string).
 * @returns A proxy object typed as `T`.
 *
 * @example
 * ```typescript
 * export const log: LoggerManager = inject(LoggerManager);
 * export const cache: CacheManager = inject(CACHE_MANAGER);
 * ```
 */
function inject<T extends object>(token: InjectionToken<T>): T {
  return new Proxy({} as T, {
    get(_target: T, prop: string | symbol): any {
      const app = getGlobalApplicationContext();

      // ── Graceful handling before bootstrap ─────────────────────────
      if (!app) {
        // Symbol properties used by JS runtime for type coercion
        if (prop === Symbol.toPrimitive) return () => `[inject:${String(token)}]`;
        if (prop === Symbol.toStringTag) return `inject<${String(token)}>`;
        if (prop === Symbol.iterator) return undefined;

        // String coercion
        if (prop === "toString") return () => `[inject:${String(token)}]`;
        if (prop === "valueOf") return () => null;
        if (prop === "toJSON") return () => null;

        // React / DevTools inspection
        if (prop === "$$typeof") return undefined;
        if (prop === "constructor") return undefined;
        if (prop === "prototype") return undefined;
        if (prop === "render") return undefined;
        if (prop === "displayName") return undefined;
        if (prop === "name") return `inject<${String(token)}>`;
        if (prop === "length") return 0;
        if (prop === "caller") return undefined;
        if (prop === "arguments") return undefined;
        if (prop === "apply") return undefined;
        if (prop === "call") return undefined;
        if (prop === "bind") return undefined;

        // Node.js / util.inspect
        if (typeof prop === "string" && prop.startsWith("@@__IMMUTABLE")) return undefined;
        if (prop === "inspect" || prop === "nodeType") return undefined;

        throw new Error(
          `inject(${String(token)}) cannot resolve — application not bootstrapped yet. ` +
            `Ensure ApplicationFactory.create() has been called before accessing this service.`,
        );
      }

      const key = getTokenKey(token);

      // Resolve with caching
      let instance: any;
      if (resolvedInstances.has(key)) {
        instance = resolvedInstances.get(key);
      } else {
        instance = app.get(token);
        resolvedInstances.set(key, instance);
      }

      const value = instance[prop];

      // Bind methods to the instance so `this` works correctly
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

/**
 * Swap the resolved instance for a token.
 *
 * Replaces the cached instance with the provided one.
 * Useful for testing — swap in a mock, run tests, then clear.
 *
 * @param token - The injection token to swap.
 * @param instance - The replacement instance (typically a mock).
 *
 * @example
 * ```typescript
 * inject.swap(LoggerManager, mockLogger);
 * ```
 */
inject.swap = function swap(token: InjectionToken, instance: any): void {
  const key = getTokenKey(token);
  resolvedInstances.set(key, instance);
};

/**
 * Clear a specific cached instance.
 *
 * The next access will re-resolve from the container.
 *
 * @param token - The injection token to clear.
 */
inject.clear = function clear(token: InjectionToken): void {
  const key = getTokenKey(token);
  resolvedInstances.delete(key);
};

/**
 * Clear all cached instances.
 *
 * Typically called in test teardown to ensure a clean state.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   inject.clearAll();
 * });
 * ```
 */
inject.clearAll = function clearAll(): void {
  resolvedInstances.clear();
};

export { inject };
