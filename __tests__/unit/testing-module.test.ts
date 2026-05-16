/**
 * Unit tests for TestingModule.
 *
 * Tests: Provider overrides, useValue/useClass/useFactory overrides, compile
 *
 * @module __tests__/unit/testing-module
 */

import { describe, it, expect, vi } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Module } from "@/decorators/module.decorator";
import { TestingModule } from "@/testing/testing.module";

describe("TestingModule", () => {
  describe("Basic compilation", () => {
    it("should compile a module without overrides", async () => {
      @Injectable()
      class SimpleService {
        getValue() {
          return "real";
        }
      }

      @Module({ providers: [SimpleService] })
      class TestModule {}

      const app = await TestingModule.create(TestModule).compile();
      const service = app.get(SimpleService);

      expect(service.getValue()).toBe("real");
    });
  });

  describe("useValue override", () => {
    it("should override a class provider with a value", async () => {
      @Injectable()
      class DatabaseService {
        query() {
          return "real-db-result";
        }
      }

      @Injectable()
      class UserService {
        constructor(public db: DatabaseService) {}
      }

      @Module({ providers: [DatabaseService, UserService] })
      class TestModule {}

      const mockDb = { query: vi.fn(() => "mock-result") };

      const app = await TestingModule.create(TestModule)
        .overrideProvider(DatabaseService)
        .useValue(mockDb)
        .compile();

      const userService = app.get(UserService);
      expect(userService.db.query()).toBe("mock-result");
    });

    it("should override a symbol token with a value", async () => {
      const CONFIG = Symbol("CONFIG");

      @Injectable()
      class ServiceWithConfig {
        constructor(@Inject(CONFIG) public config: any) {}
      }

      @Module({
        providers: [{ provide: CONFIG, useValue: { env: "production" } }, ServiceWithConfig],
      })
      class TestModule {}

      const app = await TestingModule.create(TestModule)
        .overrideProvider(CONFIG)
        .useValue({ env: "test" })
        .compile();

      const service = app.get(ServiceWithConfig);
      expect(service.config).toEqual({ env: "test" });
    });
  });

  describe("useClass override", () => {
    it("should override a provider with a different class", async () => {
      @Injectable()
      class RealLogger {
        log(msg: string) {
          return `[REAL] ${msg}`;
        }
      }

      @Injectable()
      class MockLogger {
        log(msg: string) {
          return `[MOCK] ${msg}`;
        }
      }

      @Injectable()
      class AppService {
        constructor(public logger: RealLogger) {}
      }

      @Module({ providers: [RealLogger, AppService] })
      class TestModule {}

      const app = await TestingModule.create(TestModule)
        .overrideProvider(RealLogger)
        .useClass(MockLogger)
        .compile();

      const service = app.get(AppService);
      expect(service.logger.log("test")).toBe("[MOCK] test");
    });
  });

  describe("useFactory override", () => {
    it("should override a provider with a factory", async () => {
      @Injectable()
      class HeavyService {
        constructor() {
          // Simulates expensive initialization
        }
        compute() {
          return "heavy-result";
        }
      }

      @Module({ providers: [HeavyService] })
      class TestModule {}

      const app = await TestingModule.create(TestModule)
        .overrideProvider(HeavyService)
        .useFactory(() => ({ compute: () => "light-result" }))
        .compile();

      const service = app.get(HeavyService);
      expect(service.compute()).toBe("light-result");
    });
  });

  describe("Multiple overrides", () => {
    it("should support chaining multiple overrides", async () => {
      const TOKEN_A = Symbol("A");
      const TOKEN_B = Symbol("B");

      @Module({
        providers: [
          { provide: TOKEN_A, useValue: "real-a" },
          { provide: TOKEN_B, useValue: "real-b" },
        ],
      })
      class TestModule {}

      const app = await TestingModule.create(TestModule)
        .overrideProvider(TOKEN_A)
        .useValue("mock-a")
        .overrideProvider(TOKEN_B)
        .useValue("mock-b")
        .compile();

      expect(app.get(TOKEN_A)).toBe("mock-a");
      expect(app.get(TOKEN_B)).toBe("mock-b");
    });
  });
});
