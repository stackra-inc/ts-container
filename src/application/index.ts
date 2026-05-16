/**
 * Application Barrel Export
 *
 * Bootstrap layer for the DI container. Mirrors NestJS's `NestFactory` +
 * `NestApplicationContext` pattern for 100% client-side use.
 *
 * - {@link ApplicationFactory} — Static factory (`create`, `builder`)
 * - {@link ApplicationContext} — The bootstrapped context instance
 * - {@link ApplicationBuilder} — Fluent builder API with lifecycle hooks
 * - {@link getGlobalApplicationContext} — Get the global context
 * - {@link hasGlobalApplicationContext} — Check if a global context exists
 * - {@link setGlobalApplicationContext} — Set the global context (internal)
 * - {@link clearGlobalApplicationContext} — Clear the global context (testing)
 *
 * @module application
 */

export { ApplicationFactory } from "../factories/application.factory";
export { ApplicationContext } from "../services/application-context.service";
export { ApplicationBuilder } from "../services/application-builder.service";
export {
  getGlobalApplicationContext,
  hasGlobalApplicationContext,
  setGlobalApplicationContext,
  clearGlobalApplicationContext,
} from "../utils/global-application.util";
