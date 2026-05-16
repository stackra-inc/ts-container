/**
 * Unit tests for property injection.
 *
 * Tests: @Inject on properties, @Optional on properties, mixed injection
 *
 * @module __tests__/unit/property-injection
 */

import { describe, it, expect } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Optional } from "@/decorators/optional.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("Property Injection", () => {
  describe("Basic property injection", () => {
    it("should inject a class dependency via property", async () => {
      @Injectable()
      class LoggerService {
        log(msg: string) {
          return `[LOG] ${msg}`;
        }
      }

      @Injectable()
      class UserService {
        @Inject(LoggerService)
        public logger!: LoggerService;
      }

      @Module({ providers: [LoggerService, UserService] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(UserService);

      expect(service.logger).toBeInstanceOf(LoggerService);
      expect(service.logger.log("test")).toBe("[LOG] test");
    });

    it("should inject a symbol token via property", async () => {
      const CONFIG = Symbol("CONFIG");

      @Injectable()
      class ServiceWithConfig {
        @Inject(CONFIG)
        public config!: any;
      }

      @Module({
        providers: [{ provide: CONFIG, useValue: { debug: true } }, ServiceWithConfig],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithConfig);

      expect(service.config).toEqual({ debug: true });
    });
  });

  describe("Optional property injection", () => {
    it("should leave optional property as undefined when not available", async () => {
      const OPTIONAL_TOKEN = Symbol("OPTIONAL_PROP");

      @Injectable()
      class ServiceWithOptionalProp {
        @Optional()
        @Inject(OPTIONAL_TOKEN)
        public optionalDep?: any;
      }

      @Module({ providers: [ServiceWithOptionalProp] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithOptionalProp);

      expect(service.optionalDep).toBeUndefined();
    });

    it("should inject optional property when available", async () => {
      const OPTIONAL_TOKEN = Symbol("OPTIONAL_PROP");

      @Injectable()
      class ServiceWithOptionalProp {
        @Optional()
        @Inject(OPTIONAL_TOKEN)
        public optionalDep?: string;
      }

      @Module({
        providers: [{ provide: OPTIONAL_TOKEN, useValue: "available" }, ServiceWithOptionalProp],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithOptionalProp);

      expect(service.optionalDep).toBe("available");
    });
  });

  describe("Mixed constructor and property injection", () => {
    it("should support both constructor and property injection", async () => {
      const PROP_TOKEN = Symbol("PROP");

      @Injectable()
      class DepService {
        getValue() {
          return "constructor-dep";
        }
      }

      @Injectable()
      class MixedService {
        @Inject(PROP_TOKEN)
        public propDep!: string;

        constructor(public constructorDep: DepService) {}
      }

      @Module({
        providers: [DepService, { provide: PROP_TOKEN, useValue: "property-dep" }, MixedService],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(MixedService);

      expect(service.constructorDep).toBeInstanceOf(DepService);
      expect(service.constructorDep.getValue()).toBe("constructor-dep");
      expect(service.propDep).toBe("property-dep");
    });
  });
});
