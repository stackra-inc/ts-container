/**
 * useInject Hook
 *
 * Resolve a provider from the DI container in a React component.
 * This is the primary hook for accessing services.
 *
 * @module hooks/use-inject
 */

import { useMemo } from "react";

import type { InjectionToken } from "@/interfaces/injection-token.interface";
import { inject } from "@/inject";

/**
 * Resolve a provider from the DI container.
 *
 * The resolved instance is memoized — it won't change between renders
 * unless the container or token changes.
 *
 * @typeParam T - The type of the resolved provider
 * @param token - The injection token (class, string, or symbol)
 * @returns The resolved provider instance
 *
 * @throws Error if the provider is not found or if used outside `<ContainerProvider>`
 *
 * @example
 * ```typescript
 * // Inject by class
 * function UserProfile() {
 *   const userService = useInject(UserService);
 *   const user = userService.getUser('123');
 *   return <div>{user.name}</div>;
 * }
 *
 * // Inject by symbol token
 * function CacheStatus() {
 *   const config = useInject<CacheConfig>(CACHE_CONFIG);
 *   return <div>Default store: {config.default}</div>;
 * }
 * ```
 */
export function useInject<T extends object = object>(token: InjectionToken<T>): T {
  return useMemo(() => inject<T>(token), [token]);
}
