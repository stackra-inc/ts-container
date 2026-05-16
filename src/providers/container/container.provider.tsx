/**
 * ContainerProvider Component
 *
 * Wrap your application (or a subtree) with `<ContainerProvider>` to make
 * the DI container available to all child components via `useInject()`.
 *
 * ## Usage (with global application - recommended):
 *
 * ```tsx
 * // main.ts
 * await ApplicationFactory.create(AppModule);
 *
 * // App.tsx
 * ReactDOM.createRoot(root).render(
 *   <ContainerProvider>
 *     <App />
 *   </ContainerProvider>
 * );
 * ```
 *
 * ## Usage (with explicit context - legacy):
 *
 * ```tsx
 * const app = await ApplicationFactory.create(AppModule);
 *
 * ReactDOM.createRoot(root).render(
 *   <ContainerProvider context={app}>
 *     <App />
 *   </ContainerProvider>
 * );
 * ```
 *
 * @module react/providers/container
 */

import { createElement } from "react";
import { ContainerContext } from "@/contexts/container.context";
import { getGlobalApplicationContext } from "@/utils/global-application.util";
import type { ContainerProviderProps } from "@/interfaces/container-provider-props.interface";

/**
 * Provides the DI container to the React component tree.
 *
 * If no `context` prop is provided, automatically uses the global application
 * instance created by `ApplicationFactory.create()`.
 *
 * @param props - The provider props (context is optional)
 * @returns A React element wrapping children with the container context
 *
 * @example
 * ```tsx
 * // Option 1: Global application (recommended)
 * await ApplicationFactory.create(AppModule);
 * <ContainerProvider>
 *   <App />
 * </ContainerProvider>
 *
 * // Option 2: Explicit context (legacy)
 * const app = await ApplicationFactory.create(AppModule);
 * <ContainerProvider context={app}>
 *   <App />
 * </ContainerProvider>
 * ```
 */
export function ContainerProvider({ context, children }: ContainerProviderProps) {
  // Use explicit context if provided, otherwise use global application
  const resolvedContext = context ?? getGlobalApplicationContext();

  if (!resolvedContext) {
    throw new Error(
      "ContainerProvider: No container context found. " +
        "Either pass a context prop or call ApplicationFactory.create() before rendering. " +
        "\n\nExample:\n" +
        "  await ApplicationFactory.create(AppModule);\n" +
        "  <ContainerProvider><App /></ContainerProvider>",
    );
  }

  return createElement(ContainerContext.Provider, { value: resolvedContext }, children);
}
