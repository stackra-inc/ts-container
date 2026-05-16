/**
 * Unit tests for module imports and cross-module resolution.
 *
 * Tests: Module imports, exports, re-exports, global modules, dynamic modules
 *
 * @module __tests__/unit/module-imports
 */

import { describe, it, expect } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { Global } from "@/decorators/global.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";
import type { DynamicModule } from "@/interfaces/dynamic-module.interface";

describe("Module Imports", () => {
  describe("Basic imports", () => {
    it("should resolve providers from imported modules", async () => {
      @Injectable()
      class SharedService {
        getValue() {
          return "shared";
        }
      }

      @Module({ providers: [SharedService], exports: [SharedService] })
      class SharedModule {}

      @Injectable()
      class ConsumerService {
        constructor(public shared: SharedService) {}
      }

      @Module({ imports: [SharedModule], providers: [ConsumerService] })
      class ConsumerModule {}

      const app = await ApplicationFactory.create(ConsumerModule);
      const consumer = app.get(ConsumerService);

      expect(consumer.shared).toBeInstanceOf(SharedService);
      expect(consumer.shared.getValue()).toBe("shared");
    });

    it("should not resolve non-exported providers from imported modules", async () => {
      @Injectable()
      class InternalService {}

      @Module({ providers: [InternalService] })
      class InternalModule {}

      @Injectable()
      class ConsumerService {
        constructor(public internal: InternalService) {}
      }

      @Module({ imports: [InternalModule], providers: [ConsumerService] })
      class ConsumerModule {}

      await expect(ApplicationFactory.create(ConsumerModule)).rejects.toThrow();
    });
  });

  describe("Global modules", () => {
    it("should make providers available without explicit import", async () => {
      @Injectable()
      class GlobalService {
        getValue() {
          return "global";
        }
      }

      @Global()
      @Module({ providers: [GlobalService], exports: [GlobalService] })
      class GlobalModule {}

      @Injectable()
      class LeafService {
        constructor(public global: GlobalService) {}
      }

      @Module({ providers: [LeafService] })
      class LeafModule {}

      @Module({ imports: [GlobalModule, LeafModule] })
      class RootModule {}

      const app = await ApplicationFactory.create(RootModule);
      const leaf = app.get(LeafService);

      expect(leaf.global).toBeInstanceOf(GlobalService);
      expect(leaf.global.getValue()).toBe("global");
    });
  });

  describe("Dynamic modules", () => {
    it("should support forRoot() pattern with dynamic module", async () => {
      const CONFIG_TOKEN = Symbol("CONFIG");

      @Injectable()
      class ConfigurableService {
        constructor(@Inject(CONFIG_TOKEN) public config: any) {}
      }

      @Module({})
      class ConfigurableModule {
        static forRoot(config: Record<string, any>): DynamicModule {
          return {
            module: ConfigurableModule,
            providers: [{ provide: CONFIG_TOKEN, useValue: config }, ConfigurableService],
            exports: [ConfigurableService],
          };
        }
      }

      @Module({ imports: [ConfigurableModule.forRoot({ apiUrl: "https://api.test" })] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const service = app.get(ConfigurableService);

      expect(service.config).toEqual({ apiUrl: "https://api.test" });
    });

    it("should support global dynamic modules", async () => {
      const TOKEN = Symbol("DYNAMIC_GLOBAL");

      @Module({})
      class DynamicGlobalModule {
        static forRoot(): DynamicModule {
          return {
            module: DynamicGlobalModule,
            global: true,
            providers: [{ provide: TOKEN, useValue: "dynamic-global" }],
            exports: [TOKEN],
          };
        }
      }

      @Injectable()
      class LeafService {
        constructor(@Inject(TOKEN) public value: string) {}
      }

      @Module({ providers: [LeafService] })
      class LeafModule {}

      @Module({ imports: [DynamicGlobalModule.forRoot(), LeafModule] })
      class RootModule {}

      const app = await ApplicationFactory.create(RootModule);
      const leaf = app.get(LeafService);

      expect(leaf.value).toBe("dynamic-global");
    });
  });

  describe("Re-exports", () => {
    it("should support re-exporting imported modules", async () => {
      @Injectable()
      class BaseService {
        getValue() {
          return "base";
        }
      }

      @Module({ providers: [BaseService], exports: [BaseService] })
      class BaseModule {}

      // MiddleModule imports and re-exports BaseModule
      @Module({ imports: [BaseModule], exports: [BaseModule] })
      class MiddleModule {}

      @Injectable()
      class TopService {
        constructor(public base: BaseService) {}
      }

      @Module({ imports: [MiddleModule], providers: [TopService] })
      class TopModule {}

      const app = await ApplicationFactory.create(TopModule);
      const top = app.get(TopService);

      expect(top.base).toBeInstanceOf(BaseService);
    });
  });
});
