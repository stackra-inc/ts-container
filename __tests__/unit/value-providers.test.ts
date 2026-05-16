/**
 * Unit tests for value providers.
 *
 * Tests: useValue, useExisting (alias), useClass
 *
 * @module __tests__/unit/value-providers
 */

import { describe, it, expect } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("Value Providers", () => {
  describe("useValue", () => {
    it("should resolve a string value provider", async () => {
      const TOKEN = Symbol("STRING_VALUE");

      @Module({
        providers: [{ provide: TOKEN, useValue: "hello" }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      expect(app.get(TOKEN)).toBe("hello");
    });

    it("should resolve a number value provider", async () => {
      const TOKEN = Symbol("NUMBER_VALUE");

      @Module({
        providers: [{ provide: TOKEN, useValue: 42 }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      expect(app.get(TOKEN)).toBe(42);
    });

    it("should resolve an object value provider", async () => {
      const TOKEN = Symbol("OBJECT_VALUE");
      const config = { host: "localhost", port: 3000, debug: true };

      @Module({
        providers: [{ provide: TOKEN, useValue: config }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      expect(app.get(TOKEN)).toEqual(config);
      expect(app.get(TOKEN)).toBe(config); // Same reference
    });

    it("should resolve null value providers", async () => {
      const NULL_TOKEN = Symbol("NULL");

      @Module({
        providers: [{ provide: NULL_TOKEN, useValue: null }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      expect(app.get(NULL_TOKEN)).toBeNull();
    });

    it("should resolve falsy value providers", async () => {
      const ZERO_TOKEN = Symbol("ZERO");
      const EMPTY_TOKEN = Symbol("EMPTY");
      const FALSE_TOKEN = Symbol("FALSE");

      @Module({
        providers: [
          { provide: ZERO_TOKEN, useValue: 0 },
          { provide: EMPTY_TOKEN, useValue: "" },
          { provide: FALSE_TOKEN, useValue: false },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      expect(app.get(ZERO_TOKEN)).toBe(0);
      expect(app.get(EMPTY_TOKEN)).toBe("");
      expect(app.get(FALSE_TOKEN)).toBe(false);
    });

    it("should resolve array value providers", async () => {
      const TOKEN = Symbol("ARRAY_VALUE");
      const items = [1, 2, 3, "four"];

      @Module({
        providers: [{ provide: TOKEN, useValue: items }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      expect(app.get(TOKEN)).toEqual(items);
    });
  });

  describe("useClass", () => {
    it("should resolve a class provider with useClass", async () => {
      @Injectable()
      class OriginalService {
        getName() {
          return "original";
        }
      }

      @Injectable()
      class AlternativeService {
        getName() {
          return "alternative";
        }
      }

      const TOKEN = Symbol("SERVICE");

      @Module({
        providers: [{ provide: TOKEN, useClass: AlternativeService }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(TOKEN);

      expect(service).toBeInstanceOf(AlternativeService);
      expect(service.getName()).toBe("alternative");
    });

    it("should resolve dependencies of useClass provider", async () => {
      @Injectable()
      class DepService {
        getValue() {
          return "dep-value";
        }
      }

      @Injectable()
      class MainService {
        constructor(public dep: DepService) {}
      }

      const TOKEN = Symbol("MAIN");

      @Module({
        providers: [DepService, { provide: TOKEN, useClass: MainService }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(TOKEN);

      expect(service).toBeInstanceOf(MainService);
      expect(service.dep).toBeInstanceOf(DepService);
    });
  });

  describe("useExisting (alias)", () => {
    it("should resolve an alias to an existing provider", async () => {
      @Injectable()
      class RealService {
        getValue() {
          return "real";
        }
      }

      const ALIAS_TOKEN = Symbol("ALIAS");

      @Module({
        providers: [RealService, { provide: ALIAS_TOKEN, useExisting: RealService }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const aliased = app.get(ALIAS_TOKEN);
      const real = app.get(RealService);

      expect(aliased).toBe(real);
      expect(aliased.getValue()).toBe("real");
    });
  });

  describe("Value injection into classes", () => {
    it("should inject value providers into class constructors", async () => {
      const API_URL = Symbol("API_URL");

      @Injectable()
      class ApiService {
        constructor(@Inject(API_URL) public url: string) {}
      }

      @Module({
        providers: [{ provide: API_URL, useValue: "https://api.test" }, ApiService],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ApiService);

      expect(service.url).toBe("https://api.test");
    });
  });
});
