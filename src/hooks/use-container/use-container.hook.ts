/**
 * useContainer Hook
 *
 * Access the raw `ContainerResolver` from React context.
 *
 * @module hooks/use-container
 */

import { useContext } from "react";

import type { ContainerResolver } from "@/interfaces/container-resolver.interface";
import { ContainerContext } from "@/contexts/container.context";

/**
 * Get the container resolver from React context.
 *
 * Returns the `ContainerResolver` provided by `<ContainerProvider>`.
 * Useful when you need direct access to `has()` or other resolver methods.
 *
 * For most cases, prefer `useInject()` instead.
 *
 * @returns The `ContainerResolver` instance
 *
 * @throws Error if used outside of `<ContainerProvider>`
 *
 * @example
 * ```typescript
 * function DebugPanel() {
 *   const container = useContainer();
 *   const hasCache = container.has(CacheManager);
 *   return <div>Cache available: {String(hasCache)}</div>;
 * }
 * ```
 */
export function useContainer(): ContainerResolver {
  const context = useContext(ContainerContext);

  if (!context) {
    throw new Error(
      "useContainer() must be used within a <ContainerProvider>. " +
        "Wrap your component tree with <ContainerProvider context={app}>.",
    );
  }

  return context;
}
