/**
 * Unit tests for multi-providers and provider composition.
 *
 * Tests: Multiple providers for same token, provider arrays, registerWith
 *
 * @module __tests__/unit/multi-providers
 */

import { describe, it, expect } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";
import { registerWith } from "@/utils/register-with.util";

describe("Multi-Providers", () => {
  describe("Provider override (last wins)", () => {
    it("should use the last registered provider for a token", async () => {
      const TOKEN = Symbol("OVERRIDE");

      @Module({
        providers: [
          { provide: TOKEN, useValue: "first" },
          { provide: TOKEN, useValue: "second" },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const value = app.get(TOKEN);

      // Last provider wins
      expect(value).toBe("second");
    });
  });

  describe("Provider composition across modules", () => {
    it("should resolve providers from multiple imported modules", async () => {
      @Injectable()
      class ServiceA {
        getValue() {
          return "A";
        }
      }

      @Injectable()
      class ServiceB {
        getValue() {
          return "B";
        }
      }

      @Module({ providers: [ServiceA], exports: [ServiceA] })
      class ModuleA {}

      @Module({ providers: [ServiceB], exports: [ServiceB] })
      class ModuleB {}

      @Injectable()
      class CompositeService {
        constructor(
          public a: ServiceA,
          public b: ServiceB,
        ) {}
      }

      @Module({
        imports: [ModuleA, ModuleB],
        providers: [CompositeService],
      })
      class RootModule {}

      const app = await ApplicationFactory.create(RootModule);
      const composite = app.get(CompositeService);

      expect(composite.a.getValue()).toBe("A");
      expect(composite.b.getValue()).toBe("B");
    });
  });

  describe("registerWith utility", () => {
    it("should create a provider registration object", () => {
      @Injectable()
      class TestService {}

      const registration = registerWith(TestService);

      expect(registration).toBeDefined();
      expect(typeof registration).toBe("object");
    });
  });

  describe("String token providers", () => {
    it("should resolve providers with string tokens", async () => {
      @Injectable()
      class ServiceWithStringDep {
        constructor(@Inject("API_VERSION") public version: string) {}
      }

      @Module({
        providers: [{ provide: "API_VERSION", useValue: "v2" }, ServiceWithStringDep],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithStringDep);

      expect(service.version).toBe("v2");
    });
  });

  describe("Class shorthand providers", () => {
    it("should resolve class shorthand (class as its own provider)", async () => {
      @Injectable()
      class SimpleService {
        getValue() {
          return "simple";
        }
      }

      @Module({ providers: [SimpleService] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(SimpleService);

      expect(service).toBeInstanceOf(SimpleService);
      expect(service.getValue()).toBe("simple");
    });
  });
});
