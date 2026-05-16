/**
 * Feature tests for end-to-end bootstrap scenarios.
 *
 * Tests: multi-module, dynamic modules, global modules, lifecycle
 *
 * @module __tests__/feature/bootstrap-scenarios
 */

import { describe, it, expect, afterEach } from "vitest";
import { defineMetadata } from "@vivtel/metadata";

import { ApplicationFactory } from "@/application/application-factory";
import { clearGlobalApplicationContext } from "@/application/global-application";
import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Module } from "@/decorators/module.decorator";
import { Global } from "@/decorators/global.decorator";
import { PARAMTYPES_METADATA } from "@/constants";
import type { DynamicModule } from "@/interfaces/dynamic-module.interface";

describe("Bootstrap Scenarios (feature)", () => {
  afterEach(() => {
    clearGlobalApplicationContext();
  });

  describe("multi-module application", () => {
    it("bootstraps an app with multiple modules and cross-module dependencies", async () => {
      @Injectable()
      class DatabaseService {
        public connected = true;
      }

      @Module({ providers: [DatabaseService], exports: [DatabaseService] })
      class DatabaseModule {}

      @Injectable()
      class UserService {
        constructor(public db: DatabaseService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [DatabaseService], UserService);

      @Module({ imports: [DatabaseModule], providers: [UserService], exports: [UserService] })
      class UserModule {}

      @Injectable()
      class AppService {
        constructor(public users: UserService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [UserService], AppService);

      @Module({ imports: [UserModule], providers: [AppService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      const appService = app.get(AppService);
      expect(appService).toBeInstanceOf(AppService);
      expect(appService.users).toBeInstanceOf(UserService);
      expect(appService.users.db).toBeInstanceOf(DatabaseService);
      expect(appService.users.db.connected).toBe(true);

      await app.close();
    });
  });

  describe("dynamic modules", () => {
    it("bootstraps with forRoot() dynamic module pattern", async () => {
      const CONFIG_TOKEN = Symbol("CONFIG");

      @Injectable()
      class ConfigService {
        constructor(@Inject(CONFIG_TOKEN) public config: any) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [Object], ConfigService);

      @Module({})
      class ConfigModule {
        static forRoot(config: Record<string, any>): DynamicModule {
          return {
            module: ConfigModule,
            providers: [{ provide: CONFIG_TOKEN, useValue: config }, ConfigService],
            exports: [ConfigService],
          };
        }
      }

      @Injectable()
      class AppService {
        constructor(public config: ConfigService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [ConfigService], AppService);

      @Module({
        imports: [ConfigModule.forRoot({ apiUrl: "https://api.test.com" })],
        providers: [AppService],
      })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      const appService = app.get(AppService);
      expect(appService.config.config).toEqual({ apiUrl: "https://api.test.com" });

      await app.close();
    });
  });

  describe("global modules", () => {
    it("makes global module exports available without explicit import", async () => {
      @Injectable()
      class LoggerService {
        public log(msg: string) {
          return msg;
        }
      }

      @Global()
      @Module({ providers: [LoggerService], exports: [LoggerService] })
      class LoggerModule {}

      @Injectable()
      class FeatureService {
        constructor(public logger: LoggerService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [LoggerService], FeatureService);

      @Module({ providers: [FeatureService] })
      class FeatureModule {}

      @Module({ imports: [LoggerModule, FeatureModule] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      const feature = app.get(FeatureService);
      expect(feature.logger).toBeInstanceOf(LoggerService);
      expect(feature.logger.log("test")).toBe("test");

      await app.close();
    });

    it("supports global: true in dynamic modules", async () => {
      @Injectable()
      class GlobalConfigService {
        public value = "global-config";
      }

      @Module({})
      class GlobalConfigModule {
        static forRoot(): DynamicModule {
          return {
            module: GlobalConfigModule,
            global: true,
            providers: [GlobalConfigService],
            exports: [GlobalConfigService],
          };
        }
      }

      @Injectable()
      class ConsumerService {
        constructor(public config: GlobalConfigService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [GlobalConfigService], ConsumerService);

      @Module({ providers: [ConsumerService] })
      class ConsumerModule {}

      @Module({ imports: [GlobalConfigModule.forRoot(), ConsumerModule] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      const consumer = app.get(ConsumerService);
      expect(consumer.config.value).toBe("global-config");

      await app.close();
    });
  });

  describe("lifecycle integration", () => {
    it("executes full lifecycle in correct order across modules", async () => {
      const order: string[] = [];

      @Injectable()
      class InfraService {
        onModuleInit() {
          order.push("infra:init");
        }
        onApplicationBootstrap() {
          order.push("infra:bootstrap");
        }
        beforeApplicationShutdown() {
          order.push("infra:beforeShutdown");
        }
        onApplicationShutdown() {
          order.push("infra:shutdown");
        }
        onModuleDestroy() {
          order.push("infra:destroy");
        }
      }

      @Module({ providers: [InfraService], exports: [InfraService] })
      class InfraModule {}

      @Injectable()
      class AppService {
        onModuleInit() {
          order.push("app:init");
        }
        onApplicationBootstrap() {
          order.push("app:bootstrap");
        }
        beforeApplicationShutdown() {
          order.push("app:beforeShutdown");
        }
        onApplicationShutdown() {
          order.push("app:shutdown");
        }
        onModuleDestroy() {
          order.push("app:destroy");
        }
      }

      @Module({ imports: [InfraModule], providers: [AppService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      // Init and bootstrap should have been called
      expect(order).toContain("infra:init");
      expect(order).toContain("app:init");
      expect(order).toContain("infra:bootstrap");
      expect(order).toContain("app:bootstrap");

      // All inits before all bootstraps
      const lastInit = Math.max(order.indexOf("infra:init"), order.indexOf("app:init"));
      const firstBootstrap = Math.min(
        order.indexOf("infra:bootstrap"),
        order.indexOf("app:bootstrap"),
      );
      expect(lastInit).toBeLessThan(firstBootstrap);

      await app.close();

      // Shutdown hooks should have been called
      expect(order).toContain("infra:beforeShutdown");
      expect(order).toContain("app:beforeShutdown");
      expect(order).toContain("infra:shutdown");
      expect(order).toContain("app:shutdown");
      expect(order).toContain("infra:destroy");
      expect(order).toContain("app:destroy");
    });
  });

  describe("entry providers", () => {
    it("eagerly instantiates entry providers even if not injected", async () => {
      let instantiated = false;

      @Injectable()
      class EagerService {
        constructor() {
          instantiated = true;
        }
      }

      @Module({
        providers: [EagerService],
        entryProviders: [EagerService],
      })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      expect(instantiated).toBe(true);
      await app.close();
    });
  });

  describe("factory providers with async resolution", () => {
    it("resolves async factory providers", async () => {
      @Module({
        providers: [
          {
            provide: "ASYNC_VALUE",
            useFactory: async () => {
              await new Promise((r) => setTimeout(r, 5));
              return "async-result";
            },
          },
        ],
      })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const value = app.get("ASYNC_VALUE");
      expect(value).toBe("async-result");
      await app.close();
    });
  });
});
