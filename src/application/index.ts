/**
 * Application Barrel Export
 *
 * Bootstrap layer for the DI container.
 *
 * - {@link Application} — Static factory that scans, resolves, and manages the DI container
 * - {@link getGlobalApplication} — Get the global application instance created by `Application.create()`
 * - {@link hasGlobalApplication} — Check if a global application instance exists
 * - {@link clearGlobalApplication} — Clear the global application instance (useful for testing)
 *
 * @module application
 */

export { Application } from './application';
export {
  getGlobalApplication,
  hasGlobalApplication,
  clearGlobalApplication,
  setGlobalApplication,
} from './global-application';
