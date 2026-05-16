/**
 * Types Barrel Export
 *
 * Shared type aliases used throughout the DI container.
 *
 * - {@link Type} — Class constructor type (`new (...args) => T`)
 * - {@link ModuleInput} — Root module class or dynamic import factory
 * - {@link DiscoveryOptions} — Filter union for `DiscoveryService.getProviders()`
 *
 * @module types
 */

export type { Type } from "./type.type";
export type { ModuleInput } from "./module-input.type";
export type { DiscoveryOptions } from "./discovery-options.type";
