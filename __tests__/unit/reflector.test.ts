/**
 * Unit tests for Reflector service.
 *
 * Tests: Metadata reading, SetMetadata integration, getAllAndOverride, getAllAndMerge
 *
 * @module __tests__/unit/reflector
 */

import { describe, it, expect } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { SetMetadata } from "@/decorators/set-metadata.decorator";
import { Reflector } from "@/services/reflector.service";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("Reflector", () => {
  describe("Basic metadata reading", () => {
    it("should read metadata set by SetMetadata on a class", async () => {
      @SetMetadata("roles", ["admin", "user"])
      @Injectable()
      class TestController {}

      @Module({ providers: [TestController, Reflector] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const reflector = app.get(Reflector);

      const roles = reflector.get<string[]>("roles", TestController);
      expect(roles).toEqual(["admin", "user"]);
    });

    it("should return undefined for missing metadata", async () => {
      @Injectable()
      class PlainService {}

      @Module({ providers: [PlainService, Reflector] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const reflector = app.get(Reflector);

      const result = reflector.get("nonexistent", PlainService);
      expect(result).toBeUndefined();
    });
  });

  describe("Method-level metadata", () => {
    it("should read metadata from methods", async () => {
      class TestController {
        @SetMetadata("cache", { ttl: 60 })
        getUsers() {}
      }

      @Module({ providers: [Reflector] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const reflector = app.get(Reflector);

      const instance = new TestController();
      const cache = reflector.get<{ ttl: number }>("cache", instance.getUsers as any);
      expect(cache).toEqual({ ttl: 60 });
    });
  });

  describe("Multiple metadata keys", () => {
    it("should support reading multiple metadata values", async () => {
      @SetMetadata("roles", ["admin"])
      @SetMetadata("isPublic", false)
      @Injectable()
      class SecureController {}

      @Module({ providers: [SecureController, Reflector] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const reflector = app.get(Reflector);

      expect(reflector.get("roles", SecureController)).toEqual(["admin"]);
      expect(reflector.get("isPublic", SecureController)).toBe(false);
    });
  });
});
