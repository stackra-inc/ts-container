/**
 * @stackra/ts-container
 *
 * NestJS-style dependency injection for React and client-side applications.
 * Built from scratch — no Inversify, no heavy runtime.
 *
 * This is the main entry point. It exports:
 * - Decorators (`@Injectable`, `@Inject`, `@Module`, `@Optional`, `@Global`)
 * - The DI engine (`ModuleContainer`, `Injector`, `DependenciesScanner`, `Module`, `InstanceWrapper`)
 * - Application bootstrap (`ApplicationFactory`, `ApplicationContext`, `ApplicationBuilder`)
 * - Discovery (`DiscoveryService`, `DiscoveryModule`, `DiscoverableMetaHostCollection`)
 * - React bindings (`ContainerProvider`, `useInject`, `useOptionalInject`, `useContainer`)
 * - Interfaces, types, and enums
 * - Utilities (`forwardRef`, `inject`, `registerWith`, `defineConfig`)
 *
 * @example
 * ```typescript
 * import 'reflect-metadata';
 * import { Injectable, Module, ApplicationFactory } from '@stackra/ts-container';
 *
 * @Injectable()
 * class UserService {
 *   constructor(private logger: LoggerService) {}
 * }
 *
 * @Module({
 *   providers: [LoggerService, UserService],
 *   exports: [UserService],
 * })
 * class AppModule {}
 *
 * const app = await ApplicationFactory.create(AppModule);
 * const userService = app.get(UserService);
 * ```
 *
 * @module @stackra/ts-container
 */

import "reflect-metadata";

// ============================================================================
// Decorators
// ============================================================================
export { Inject } from "./decorators/inject.decorator";
export { Module } from "./decorators/module.decorator";
export { Global } from "./decorators/global.decorator";
export { Optional } from "./decorators/optional.decorator";
export { Injectable } from "./decorators/injectable.decorator";

// ============================================================================
// Interfaces & Types
// ============================================================================
export type { Type } from "./types/type.type";
export type { InjectionToken } from "./interfaces/injection-token.interface";
export type { OnApplicationShutdown } from "./interfaces/on-application-shutdown.interface";
export type { IApplicationContext } from "./interfaces/application-context.interface";

// ============================================================================
// Enums
// ============================================================================

// ============================================================================
// Utilities
// ============================================================================
export { forwardRef } from "./utils/forward-ref.util";
export { defineConfig } from "./utils/define-config.util";
export { registerWith } from "./utils/register-with.util";
export { hasOnModuleInit } from "./utils/has-on-module-init.util";
export { hasOnModuleDestroy } from "./utils/has-on-module-destroy.util";

// ============================================================================
// Lifecycle Interfaces
// ============================================================================
export type { DynamicModule, IDynamicModule } from "./interfaces/dynamic-module.interface";
export type { OnModuleInit, IOnModuleInit } from "./interfaces/on-module-init.interface";
export type {
  OnApplicationBootstrap,
  IOnApplicationBootstrap,
} from "./interfaces/on-application-bootstrap.interface";
export type { OnModuleDestroy } from "./interfaces/on-module-destroy.interface";
export type { BeforeApplicationShutdown } from "./interfaces/before-application-shutdown.interface";

// ============================================================================
// Application Bootstrap (mirrors NestJS NestFactory + NestApplicationContext)
// ============================================================================
export { ApplicationFactory } from "./factories/application.factory";
export { ApplicationFactory as Application } from "./factories/application.factory";
export { ApplicationContext } from "./services/application-context.service";
export { ApplicationBuilder } from "./services/application-builder.service";
export {
  getGlobalApplicationContext,
  hasGlobalApplicationContext,
  clearGlobalApplicationContext,
} from "./utils/global-application.util";

// ============================================================================
// inject() — Lazy DI resolution for module-level constants
// ============================================================================
export { inject } from "./inject";

// ============================================================================
// DI Engine (Container, Injector, Scanner, Module, etc.)
// ============================================================================
export { Injector } from "./services/injector.service";
export { ModuleContainer } from "./registries/container.registry";
export { Module as ModuleRef } from "./injector/module.class";
export { DependenciesScanner } from "./services/scanner.service";
export { InstanceWrapper } from "./injector/instance-wrapper.class";

// ============================================================================
// Services (injectable utilities provided by the container itself)
// ============================================================================
export { Reflector } from "./services/reflector.service";

// ============================================================================
// Discovery — Find providers tagged with custom decorators at runtime
// ============================================================================
export { DiscoveryService, DiscoveryModule, DiscoverableMetaHostCollection } from "./discovery";

// ============================================================================
// Constants (for library authors building on top of this)
// ============================================================================
export {
  MODULE_METADATA,
  PARAMTYPES_METADATA,
  INJECTABLE_WATERMARK,
  GLOBAL_MODULE_METADATA,
  SCOPE_OPTIONS_METADATA,
  OPTIONAL_DEPS_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  DISCOVERABLE_DECORATOR_KEY_PREFIX,
  DEFAULT_GLOBAL_NAME,
} from "./constants/tokens.constant";

// ============================================================================
// Devtools (DI resolution graph logging)
// ============================================================================
export { ContainerLogger } from "./devtools";

// ============================================================================
// Mixins
// ============================================================================
export { WithEnvironment } from "./mixins";
export type { IEnvironmentAware } from "./mixins";

// ============================================================================
// Testing Utilities
// ============================================================================
export { TestingModule } from "./testing";
