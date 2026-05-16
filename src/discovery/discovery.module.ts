/**
 * DiscoveryModule — Global module that exposes `DiscoveryService`.
 *
 * Import once at the root and the service is available everywhere:
 *
 * ```typescript
 * @Module({ imports: [DiscoveryModule] })
 * class AppModule {}
 * ```
 *
 * Mirrors NestJS's `DiscoveryModule` at `packages/core/discovery/discovery-module.ts`.
 *
 * @module discovery/discovery-module
 */

import { Global } from "@/decorators/global.decorator";
import { Module } from "@/decorators/module.decorator";
import { DiscoveryService } from "@/services/discovery.service";

/**
 * Global module exporting {@link DiscoveryService}.
 *
 * The service depends on `ModuleContainer`, which `ApplicationFactory.create()`
 * registers as a value provider on every module — so `DiscoveryModule`
 * can be imported anywhere without extra wiring.
 */
@Global()
@Module({
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
