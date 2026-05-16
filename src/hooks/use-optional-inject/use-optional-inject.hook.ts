/**
 * useOptionalInject Hook
 *
 * Like `useInject()`, but returns `undefined` instead of throwing
 * if the provider is not found.
 *
 * @module hooks/use-optional-inject
 */

import { useMemo } from "react";

import type { InjectionToken } from "@/interfaces/injection-token.interface";
import { useContainer } from "@/hooks/use-container";

/**
 * Optionally resolve a provider from the DI container.
 *
 * Returns `undefined` if the provider is not found, instead of throwing.
 * Useful for optional dependencies that may or may not be configured.
 *
 * @typeParam T - The type of the resolved provider
 * @param token - The injection token (class, string, or symbol)
 * @returns The resolved instance, or `undefined` if not found
 *
 * @example
 * ```typescript
 * function Analytics() {
 *   const tracker = useOptionalInject(AnalyticsService);
 *
 *   if (!tracker) {
 *     return null; // Analytics not configured
 *   }
 *
 *   return <div>Tracking enabled</div>;
 * }
 * ```
 */
export function useOptionalInject<T = any>(token: InjectionToken<T>): T | undefined {
  const container = useContainer();
  return useMemo(() => container.getOptional<T>(token), [container, token]);
}
