/**
 * Utilities Barrel Export
 *
 * Helper functions for working with the DI system.
 *
 * - {@link forwardRef} — Wraps a class reference in a lazy function to break circular dependencies
 * - {@link defineConfig} — Type-safe helper for `ApplicationFactory.create()` options
 * - {@link registerWith} — Clean factory provider for registry registration in `forFeature()`
 * - {@link generateMetadataKey} — Mint a unique key for `DiscoveryService.createDecorator()`
 * - {@link tokenName} — Convert any injection token to a human-readable string
 *
 * @module utils
 */

export { forwardRef } from "./forward-ref.util";
export { defineConfig } from "./define-config.util";
export { registerWith } from "./register-with.util";
export { generateMetadataKey } from "./generate-metadata-key.util";
export { tokenName } from "./token-name.util";
export { isCustomProvider } from "./is-custom-provider.util";
export { isClassShorthand } from "./is-class-shorthand.util";
export { isClassProvider } from "./is-class-provider.util";
export { isValueProvider } from "./is-value-provider.util";
export { isFactoryProvider } from "./is-factory-provider.util";
export { isExistingProvider } from "./is-existing-provider.util";
export { hasOnModuleInit } from "./has-on-module-init.util";
export { hasOnModuleDestroy } from "./has-on-module-destroy.util";
