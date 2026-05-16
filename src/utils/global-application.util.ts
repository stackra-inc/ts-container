/**
 * Global ApplicationContext Singleton
 *
 * Stores the application context instance globally so it can be accessed
 * by `ContainerProvider` (without needing to pass it as a prop) and by
 * the `inject()` lazy proxy.
 *
 * This pattern allows you to:
 * 1. Create the app once in `main.ts`
 * 2. Use `<ContainerProvider>` without props
 * 3. Access the container anywhere via `useContainer()` or `inject()`
 *
 * Mirrors NestJS's internal singleton pattern but adapted for client-side
 * where there's always exactly one application per page.
 *
 * @module application/global-application
 */

import type { IApplicationContext } from "@/interfaces/application-context.interface";

/**
 * The global application context instance.
 * Set by `ApplicationFactory.create()` and accessed by `ContainerProvider`
 * and `inject()`.
 */
let globalContext: IApplicationContext | undefined;

/**
 * Set the global application context instance.
 *
 * Called automatically by `ApplicationFactory.create()`. You should not
 * need to call this manually in production code.
 *
 * @param context - The application context to set globally
 *
 * @internal
 */
export function setGlobalApplicationContext(context: IApplicationContext): void {
  if (globalContext) {
    console.warn(
      "[Container] Global application context already exists. " +
        "Creating multiple contexts is not recommended. " +
        "The new context will replace the existing one.",
    );
  }
  globalContext = context;
}

/**
 * Get the global application context instance.
 *
 * Returns the context created by `ApplicationFactory.create()`.
 * Used internally by `ContainerProvider` and `inject()`.
 *
 * @returns The global application context, or `undefined` if not created yet
 *
 * @internal
 */
export function getGlobalApplicationContext(): IApplicationContext | undefined {
  return globalContext;
}

/**
 * Clear the global application context instance.
 *
 * Useful for testing or when you need to recreate the application.
 * After calling this, `getGlobalApplicationContext()` returns `undefined`
 * until `ApplicationFactory.create()` is called again.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   clearGlobalApplicationContext();
 * });
 * ```
 */
export function clearGlobalApplicationContext(): void {
  globalContext = undefined;
}

/**
 * Check if a global application context exists.
 *
 * @returns `true` if a global context has been created
 *
 * @example
 * ```typescript
 * if (hasGlobalApplicationContext()) {
 *   const app = getGlobalApplicationContext()!;
 *   app.get(SomeService);
 * }
 * ```
 */
export function hasGlobalApplicationContext(): boolean {
  return globalContext !== undefined;
}
