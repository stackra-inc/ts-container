/**
 * Unit tests for ApplicationFactory.
 *
 * Tests: create(), builder(), options, global registration
 *
 * @module __tests__/unit/application-factory
 */

import { describe, it, expect, afterEach } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";
import { ApplicationContext } from "@/services/application-context.service";
import {
  clearGlobalApplicationContext,
  hasGlobalApplicationContext,
} from "@/utils/global-application.util";

describe("ApplicationFactory", () => {
  afterEach(() => {
    clearGlobalApplicationContext();
  });

  describe("create()", () => {
    it("should create an ApplicationContext", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      expect(app).toBeInstanceOf(ApplicationContext);
    });

    it("should register the context as global", async () => {
      @Module({})
      class AppModule {}

      await ApplicationFactory.create(AppModule);
      expect(hasGlobalApplicationContext()).toBe(true);
    });

    it("should resolve providers after creation", async () => {
      @Injectable()
      class TestService {
        getValue() {
          return "test";
        }
      }

      @Module({ providers: [TestService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const service = app.get(TestService);

      expect(service).toBeInstanceOf(TestService);
      expect(service.getValue()).toBe("test");
    });

    it("should support config option", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule, {
        config: { apiUrl: "https://api.test" },
      });

      const { APP_CONFIG } = await import("@stackra/contracts");
      const config = app.get(APP_CONFIG);
      expect(config).toEqual({ apiUrl: "https://api.test" });
    });

    it("should call onReady callback", async () => {
      @Module({})
      class AppModule {}

      let readyCalled = false;
      await ApplicationFactory.create(AppModule, {
        onReady: async () => {
          readyCalled = true;
        },
      });

      expect(readyCalled).toBe(true);
    });
  });

  describe("builder()", () => {
    it("should return an ApplicationBuilder", () => {
      @Module({})
      class AppModule {}

      const builder = ApplicationFactory.builder(AppModule);
      expect(builder).toBeDefined();
      expect(typeof builder.boot).toBe("function");
    });
  });

  describe("ApplicationContext API", () => {
    it("should support has() to check provider existence", async () => {
      @Injectable()
      class ExistingService {}

      @Module({ providers: [ExistingService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      expect(app.has(ExistingService)).toBe(true);
      expect(app.has(Symbol("NONEXISTENT"))).toBe(false);
    });

    it("should support getOptional() for safe resolution", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const result = app.getOptional(Symbol("MISSING"));

      expect(result).toBeUndefined();
    });

    it("should throw on get() for missing provider", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      expect(() => app.get(Symbol("MISSING"))).toThrow(/not found/);
    });

    it("should support close() for graceful shutdown", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      await expect(app.close()).resolves.toBeUndefined();
    });
  });
});
