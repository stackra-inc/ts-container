/**
 * Interfaces Barrel Export
 *
 * All interfaces, type aliases, and enums for the DI container.
 * These define the public API surface and contracts that consumers
 * and library authors depend on.
 *
 * - {@link Type} — Represents a class constructor (`new`-able)
 * - {@link InjectionToken} — Union type for provider lookup keys (class, string, symbol)
 * - {@link Provider} — Discriminated union of all provider registration forms
 * - {@link ClassProvider} — Binds a token to a class for instantiation
 * - {@link ValueProvider} — Binds a token to a pre-existing value
 * - {@link FactoryProvider} — Binds a token to a factory function
 * - {@link ExistingProvider} — Aliases one token to another
 * - {@link ModuleMetadata} — Shape of `@Module()` decorator options
 * - {@link DynamicModule} — Configurable module returned by `forRoot()` / `forFeature()`
 * - {@link ForwardReference} — Lazy reference wrapper for circular dependency resolution
 * - {@link OnModuleInit} — Lifecycle hook called after all providers are instantiated
 * - {@link OnModuleDestroy} — Lifecycle hook called during application shutdown
 * - {@link ContainerResolver} — Minimal interface for resolving providers from a container
 * - {@link ScopeOptions} — Options for `@Injectable()` scope configuration
 * - {@link IApplicationContext} — Interface for the bootstrapped application context
 * - {@link ApplicationContextOptions} — Options for `ApplicationFactory.create()` configuration
 * - {@link ModuleMetatype} — Union type for module definitions (class, dynamic, async)
 * - {@link FilterByInclude} — Whitelist filter for `DiscoveryService.getProviders()`
 * - {@link FilterByMetadataKey} — Metadata-key filter for `DiscoveryService.getProviders()`
 * - {@link UseDiscoveredOptions} — Options for the `useDiscovered` React hook
 * - {@link DiscoverableDecorator} — Decorator factory shape returned by `DiscoveryService.createDecorator()`
 *
 * @module interfaces
 */

export type { Type } from "@/types/type.type";
export type { InjectionToken } from "./injection-token.interface";
export type { Provider } from "./provider.interface";
export type { ClassProvider } from "./class-provider.interface";
export type { ValueProvider } from "./value-provider.interface";
export type { FactoryProvider } from "./factory-provider.interface";
export type { ExistingProvider } from "./existing-provider.interface";
export type { ModuleMetadata } from "./module-metadata.interface";
export type { DynamicModule } from "./dynamic-module.interface";
export type { ForwardReference } from "./forward-reference.interface";
export type { OnModuleInit } from "./on-module-init.interface";
export type { OnModuleDestroy } from "./on-module-destroy.interface";
export type { OnApplicationBootstrap } from "./on-application-bootstrap.interface";
export type { OnApplicationShutdown } from "./on-application-shutdown.interface";
export type { BeforeApplicationShutdown } from "./before-application-shutdown.interface";
export type { ContainerResolver } from "./container-resolver.interface";
export type { ScopeOptions } from "./scope-options.interface";
export type { IApplicationContext } from "./application-context.interface";
export type { ApplicationContextOptions } from "./application-context-options.interface";
export type { ModuleMetatype } from "./module-metatype.interface";
export type { ContainerProviderProps } from "./container-provider-props.interface";
export type { FilterByInclude } from "./filter-by-include.interface";
export type { FilterByMetadataKey } from "./filter-by-metadata-key.interface";
export type { UseDiscoveredOptions } from "./use-discovered-options.interface";
export type { DiscoverableDecorator } from "./discoverable-decorator.interface";
