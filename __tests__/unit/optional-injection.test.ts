/**
 * Unit tests for optional injection.
 *
 * Tests: @Optional() on constructor params, @Optional() on properties,
 * graceful handling of missing optional deps
 *
 * @module __tests__/unit/optional-injection
 */

import { describe, it, expect } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Optional } from "@/decorators/optional.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("Optional Injection", () => {
  describe("Constructor parameter optional injection", () => {
    it("should inject undefined for missing optional dependency", async () => {
      const MISSING_TOKEN = Symbol("MISSING");

      @Injectable()
      class ServiceWithOptional {
        constructor(@Optional() @Inject(MISSING_TOKEN) public optionalDep?: any) {}
      }

      @Module({ providers: [ServiceWithOptional] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithOptional);

      expect(service.optionalDep).toBeUndefined();
    });

    it("should inject the value when optional dependency is available", async () => {
      const OPTIONAL_TOKEN = Symbol("OPTIONAL");

      @Injectable()
      class ServiceWithOptional {
        constructor(@Optional() @Inject(OPTIONAL_TOKEN) public optionalDep?: string) {}
      }

      @Module({
        providers: [{ provide: OPTIONAL_TOKEN, useValue: "present" }, ServiceWithOptional],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithOptional);

      expect(service.optionalDep).toBe("present");
    });

    it("should handle mix of required and optional dependencies", async () => {
      const REQUIRED_TOKEN = Symbol("REQUIRED");
      const OPTIONAL_TOKEN = Symbol("OPTIONAL");

      @Injectable()
      class MixedService {
        constructor(
          @Inject(REQUIRED_TOKEN) public required: string,
          @Optional() @Inject(OPTIONAL_TOKEN) public optional?: string,
        ) {}
      }

      @Module({
        providers: [{ provide: REQUIRED_TOKEN, useValue: "required-value" }, MixedService],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(MixedService);

      expect(service.required).toBe("required-value");
      expect(service.optional).toBeUndefined();
    });
  });

  describe("Error on missing required dependency", () => {
    it("should throw when a required dependency is missing", async () => {
      const REQUIRED_TOKEN = Symbol("REQUIRED");

      @Injectable()
      class ServiceWithRequired {
        constructor(@Inject(REQUIRED_TOKEN) public dep: any) {}
      }

      @Module({ providers: [ServiceWithRequired] })
      class TestModule {}

      await expect(ApplicationFactory.create(TestModule)).rejects.toThrow();
    });
  });

  describe("ApplicationContext.getOptional()", () => {
    it("should return undefined for non-existent providers", async () => {
      @Module({})
      class EmptyModule {}

      const app = await ApplicationFactory.create(EmptyModule);
      const result = app.getOptional(Symbol("NONEXISTENT"));

      expect(result).toBeUndefined();
    });

    it("should return the instance for existing providers", async () => {
      @Injectable()
      class ExistingService {
        getValue() {
          return "exists";
        }
      }

      @Module({ providers: [ExistingService] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.getOptional(ExistingService);

      expect(service).toBeInstanceOf(ExistingService);
      expect(service?.getValue()).toBe("exists");
    });
  });
});
