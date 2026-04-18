/**
 * Global Application Singleton
 *
 * Stores the application instance globally so it can be accessed by
 * ContainerProvider without needing to pass it as a prop.
 *
 * This pattern allows you to:
 * 1. Create the app once in main.ts
 * 2. Use ContainerProvider without props
 * 3. Access the container anywhere via useContainer()
 *
 * @module application/global-application
 */

import type { IApplication } from '@/interfaces';

/**
 * Global application instance.
 * Set by Application.create() and accessed by ContainerProvider.
 */
let globalApplication: IApplication | undefined;

/**
 * Set the global application instance.
 *
 * This is called automatically by Application.create().
 * You should not need to call this manually.
 *
 * @param app - The application instance to set globally
 * @internal
 */
export function setGlobalApplication(app: IApplication): void {
  if (globalApplication) {
    console.warn(
      '[Container] Global application already exists. ' +
        'Creating multiple applications is not recommended. ' +
        'The new application will replace the existing one.'
    );
  }
  globalApplication = app;
}

/**
 * Get the global application instance.
 *
 * Returns the application instance created by Application.create().
 * Used internally by ContainerProvider.
 *
 * @returns The global application instance, or undefined if not created yet
 * @internal
 */
export function getGlobalApplication(): IApplication | undefined {
  return globalApplication;
}

/**
 * Clear the global application instance.
 *
 * This is useful for testing or when you need to recreate the application.
 *
 * @internal
 */
export function clearGlobalApplication(): void {
  globalApplication = undefined;
}

/**
 * Check if a global application exists.
 *
 * @returns True if a global application has been created
 */
export function hasGlobalApplication(): boolean {
  return globalApplication !== undefined;
}
