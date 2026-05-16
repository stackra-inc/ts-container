/**
 * Unit tests for all provider registration patterns.
 *
 * Tests: class shorthand, useClass, useValue, useFactory, useExisting
 *
 * @module __tests__/unit/provider-registration
 */

import { describe, it, expect, beforeEach } from "vitest";

import { Module as ModuleClass } from "@/injector/module";
import { Scope } from "@/enums/scope.enum";
import { Injectable } from "@/decorators/injectable.decorator";

describe("Provider Registration", () => {
  let moduleRef: ModuleClass;

  beforeEach(() => {
    class TestModule {}
    moduleRef = new (ModuleClass as any)(TestModule);
  });

  describe("class shorthand", () => {
    it("registers a class as both token and metatype", () => {
      @Injectable()
      class UserService {}

      moduleRef.addProvider(UserService);

      const wrapper = moduleRef.providers.get(UserService);
      expect(wrapper).toBeDefined();
      expect(wrapper!.token).toBe(UserService);
      expect(wrapper!.metatype).toBe(UserService);
      expect(wrapper!.isResolved).toBe(false);
      expect(wrapper!.instance).toBeNull();
    });

    it("defaults to singleton scope", () => {
      @Injectable()
      class SingletonService {}

      moduleRef.addProvider(SingletonService);

      const wrapper = moduleRef.providers.get(SingletonService);
      expect(wrapper!.scope).toBe(Scope.DEFAULT);
      expect(wrapper!.isTransient).toBe(false);
    });

    it("respects transient scope from @Injectable()", () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {}

      moduleRef.addProvider(TransientService);

      const wrapper = moduleRef.providers.get(TransientService);
      expect(wrapper!.scope).toBe(Scope.TRANSIENT);
      expect(wrapper!.isTransient).toBe(true);
    });
  });

  describe("useClass provider", () => {
    it("registers with a custom token and class implementation", () => {
      @Injectable()
      class UserServiceImpl {}
      const TOKEN = Symbol("USER_SERVICE");

      moduleRef.addProvider({ provide: TOKEN, useClass: UserServiceImpl });

      const wrapper = moduleRef.providers.get(TOKEN);
      expect(wrapper).toBeDefined();
      expect(wrapper!.token).toBe(TOKEN);
      expect(wrapper!.metatype).toBe(UserServiceImpl);
      expect(wrapper!.isResolved).toBe(false);
    });

    it("allows overriding scope in provider definition", () => {
      @Injectable()
      class MyService {}

      moduleRef.addProvider({
        provide: MyService,
        useClass: MyService,
        scope: Scope.TRANSIENT,
      } as any);

      const wrapper = moduleRef.providers.get(MyService);
      expect(wrapper!.scope).toBe(Scope.TRANSIENT);
    });
  });

  describe("useValue provider", () => {
    it("registers with immediate resolution", () => {
      const CONFIG = Symbol("CONFIG");
      const configValue = { apiUrl: "https://api.example.com" };

      moduleRef.addProvider({ provide: CONFIG, useValue: configValue });

      const wrapper = moduleRef.providers.get(CONFIG);
      expect(wrapper).toBeDefined();
      expect(wrapper!.instance).toBe(configValue);
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.metatype).toBeNull();
    });

    it("supports string tokens", () => {
      moduleRef.addProvider({ provide: "API_URL", useValue: "https://api.example.com" });

      const wrapper = moduleRef.providers.get("API_URL");
      expect(wrapper).toBeDefined();
      expect(wrapper!.instance).toBe("https://api.example.com");
      expect(wrapper!.isResolved).toBe(true);
    });

    it("marks Promise values as async", () => {
      const asyncValue = Promise.resolve({ data: "test" });

      moduleRef.addProvider({ provide: "ASYNC", useValue: asyncValue });

      const wrapper = moduleRef.providers.get("ASYNC");
      expect(wrapper!.async).toBe(true);
    });

    it("supports null and undefined values", () => {
      moduleRef.addProvider({ provide: "NULL_VAL", useValue: null });

      const wrapper = moduleRef.providers.get("NULL_VAL");
      expect(wrapper!.instance).toBeNull();
      expect(wrapper!.isResolved).toBe(true);
    });
  });

  describe("useFactory provider", () => {
    it("registers factory function with inject dependencies", () => {
      const TOKEN = Symbol("FACTORY");
      const DEP_A = Symbol("DEP_A");
      const factory = (a: any) => ({ value: a });

      moduleRef.addProvider({
        provide: TOKEN,
        useFactory: factory,
        inject: [DEP_A],
      });

      const wrapper = moduleRef.providers.get(TOKEN);
      expect(wrapper).toBeDefined();
      expect(wrapper!.isFactory).toBe(true);
      expect(wrapper!.inject).toEqual([DEP_A]);
      expect(wrapper!.isResolved).toBe(false);
      expect(wrapper!.instance).toBeNull();
    });

    it("defaults inject to empty array when not provided", () => {
      moduleRef.addProvider({
        provide: "NO_DEPS",
        useFactory: () => "hello",
      });

      const wrapper = moduleRef.providers.get("NO_DEPS");
      expect(wrapper!.inject).toEqual([]);
      expect(wrapper!.isFactory).toBe(true);
    });
  });

  describe("useExisting (alias) provider", () => {
    it("registers as a synthetic factory with the target token in inject", () => {
      @Injectable()
      class OriginalService {}
      const ALIAS = Symbol("ALIAS");

      moduleRef.addProvider({ provide: ALIAS, useExisting: OriginalService });

      const wrapper = moduleRef.providers.get(ALIAS);
      expect(wrapper).toBeDefined();
      expect(wrapper!.inject).toEqual([OriginalService]);
      expect(wrapper!.isAlias).toBe(true);
      expect(wrapper!.isFactory).toBe(true);
    });
  });

  describe("exports", () => {
    it("adds a token to the exports set", () => {
      @Injectable()
      class ExportedService {}

      moduleRef.addExport(ExportedService);

      expect(moduleRef.exports.has(ExportedService)).toBe(true);
    });
  });

  describe("imports", () => {
    it("adds a module to the imports set", () => {
      class OtherModule {}
      const otherRef = new (ModuleClass as any)(OtherModule);

      moduleRef.addImport(otherRef);

      expect(moduleRef.imports.has(otherRef)).toBe(true);
    });
  });
});
