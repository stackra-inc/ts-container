/**
 * Unit tests for Injector resolution algorithm.
 *
 * Tests: own providers, imports, global, optional dependencies
 *
 * @module __tests__/unit/injector-resolution
 */

import { describe, it, expect, beforeEach } from "vitest";
import { defineMetadata } from "@vivtel/metadata";

import { Injector } from "@/injector/injector";
import { Module } from "@/injector/module";
import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Optional } from "@/decorators/optional.decorator";
import { Scope } from "@/enums/scope.enum";
import { PARAMTYPES_METADATA } from "@/constants";

describe("Injector Resolution", () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new (Injector as any)();
  });

  describe("own providers", () => {
    it("resolves a class provider with no dependencies", async () => {
      @Injectable()
      class SimpleService {
        public value = "resolved";
      }

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(SimpleService);

      await injector.resolveProviders(moduleRef);

      const wrapper = moduleRef.providers.get(SimpleService);
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance).toBeInstanceOf(SimpleService);
      expect(wrapper!.instance.value).toBe("resolved");
    });

    it("resolves a class provider with constructor dependencies", async () => {
      @Injectable()
      class ConfigService {
        public name = "config";
      }

      @Injectable()
      class UserService {
        constructor(public config: ConfigService) {}
      }

      // Simulate TypeScript's emitDecoratorMetadata
      defineMetadata(PARAMTYPES_METADATA, [ConfigService], UserService);

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(ConfigService);
      moduleRef.addProvider(UserService);

      await injector.resolveProviders(moduleRef);

      const wrapper = moduleRef.providers.get(UserService);
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance.config).toBeInstanceOf(ConfigService);
    });

    it("resolves a value provider immediately", async () => {
      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider({ provide: "API_URL", useValue: "https://api.test.com" });

      await injector.resolveProviders(moduleRef);

      const wrapper = moduleRef.providers.get("API_URL");
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance).toBe("https://api.test.com");
    });

    it("resolves a factory provider", async () => {
      @Injectable()
      class ConfigService {
        public url = "https://api.test.com";
      }

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(ConfigService);
      moduleRef.addProvider({
        provide: "HTTP_CLIENT",
        useFactory: (config: ConfigService) => ({ baseUrl: config.url }),
        inject: [ConfigService],
      });

      await injector.resolveProviders(moduleRef);

      const wrapper = moduleRef.providers.get("HTTP_CLIENT");
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance).toEqual({ baseUrl: "https://api.test.com" });
    });

    it("resolves an existing (alias) provider", async () => {
      @Injectable()
      class OriginalService {
        public name = "original";
      }

      const ALIAS = Symbol("ALIAS");

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(OriginalService);
      moduleRef.addProvider({ provide: ALIAS, useExisting: OriginalService });

      await injector.resolveProviders(moduleRef);

      const aliasWrapper = moduleRef.providers.get(ALIAS);
      const originalWrapper = moduleRef.providers.get(OriginalService);
      expect(aliasWrapper!.instance).toBe(originalWrapper!.instance);
    });
  });

  describe("imports resolution", () => {
    it("resolves dependencies from imported module exports", async () => {
      @Injectable()
      class SharedService {
        public shared = true;
      }

      @Injectable()
      class ConsumerService {
        constructor(public shared: SharedService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [SharedService], ConsumerService);

      class SharedModule {}
      class ConsumerModule {}

      const sharedModuleRef = new (Module as any)(SharedModule);
      sharedModuleRef.addProvider(SharedService);
      sharedModuleRef.addExport(SharedService);

      const consumerModuleRef = new (Module as any)(ConsumerModule);
      consumerModuleRef.addProvider(ConsumerService);
      consumerModuleRef.addImport(sharedModuleRef);

      // Resolve shared module first
      await injector.resolveProviders(sharedModuleRef);
      await injector.resolveProviders(consumerModuleRef);

      const wrapper = consumerModuleRef.providers.get(ConsumerService);
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance.shared).toBeInstanceOf(SharedService);
    });

    it("does not resolve from imported module if token is not exported", async () => {
      @Injectable()
      class PrivateService {}

      @Injectable()
      class ConsumerService {
        constructor(public dep: PrivateService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [PrivateService], ConsumerService);

      class PrivateModule {}
      class ConsumerModule {}

      const privateModuleRef = new (Module as any)(PrivateModule);
      privateModuleRef.addProvider(PrivateService);
      // NOT exported

      const consumerModuleRef = new (Module as any)(ConsumerModule);
      consumerModuleRef.addProvider(ConsumerService);
      consumerModuleRef.addImport(privateModuleRef);

      await injector.resolveProviders(privateModuleRef);

      await expect(injector.resolveProviders(consumerModuleRef)).rejects.toThrow(
        /Cannot resolve dependency/,
      );
    });
  });

  describe("global module resolution", () => {
    it("resolves from global module without explicit import", async () => {
      @Injectable()
      class GlobalService {
        public global = true;
      }

      @Injectable()
      class ConsumerService {
        constructor(public dep: GlobalService) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [GlobalService], ConsumerService);

      class GlobalModule {}
      class ConsumerModule {}

      const globalModuleRef = new (Module as any)(GlobalModule);
      globalModuleRef.isGlobal = true;
      globalModuleRef.addProvider(GlobalService);
      globalModuleRef.addExport(GlobalService);

      const consumerModuleRef = new (Module as any)(ConsumerModule);
      consumerModuleRef.addProvider(ConsumerService);
      // Simulate bindGlobalScope — add global module as import
      consumerModuleRef.addImport(globalModuleRef);

      await injector.resolveProviders(globalModuleRef);
      await injector.resolveProviders(consumerModuleRef);

      const wrapper = consumerModuleRef.providers.get(ConsumerService);
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance.dep).toBeInstanceOf(GlobalService);
    });
  });

  describe("optional dependencies", () => {
    it("injects undefined for optional missing dependencies", async () => {
      @Injectable()
      class ServiceWithOptional {
        constructor(@Optional() @Inject("MISSING") public dep: any) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [Object], ServiceWithOptional);

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(ServiceWithOptional);

      await injector.resolveProviders(moduleRef);

      const wrapper = moduleRef.providers.get(ServiceWithOptional);
      expect(wrapper!.isResolved).toBe(true);
      expect(wrapper!.instance.dep).toBeUndefined();
    });

    it("throws for non-optional missing dependencies", async () => {
      @Injectable()
      class ServiceWithRequired {
        constructor(@Inject("MISSING") public dep: any) {}
      }

      defineMetadata(PARAMTYPES_METADATA, [Object], ServiceWithRequired);

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(ServiceWithRequired);

      await expect(injector.resolveProviders(moduleRef)).rejects.toThrow(
        /Cannot resolve dependency/,
      );
    });
  });

  describe("transient scope", () => {
    it("creates a new instance on each resolution for transient providers", async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        public id = Math.random();
      }

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(TransientService);

      const wrapper = moduleRef.providers.get(TransientService)!;
      const instance1 = await injector.resolveInstance(wrapper, moduleRef);
      const instance2 = await injector.resolveInstance(wrapper, moduleRef);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("lookupProvider", () => {
    it("finds provider in own module", () => {
      @Injectable()
      class MyService {}

      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);
      moduleRef.addProvider(MyService);

      const result = injector.lookupProvider(MyService, moduleRef);
      expect(result).toBeDefined();
      expect(result!.host).toBe(moduleRef);
    });

    it("finds provider in imported module exports", () => {
      @Injectable()
      class SharedService {}

      class SharedModule {}
      class ConsumerModule {}

      const sharedModuleRef = new (Module as any)(SharedModule);
      sharedModuleRef.addProvider(SharedService);
      sharedModuleRef.addExport(SharedService);

      const consumerModuleRef = new (Module as any)(ConsumerModule);
      consumerModuleRef.addImport(sharedModuleRef);

      const result = injector.lookupProvider(SharedService, consumerModuleRef);
      expect(result).toBeDefined();
      expect(result!.host).toBe(sharedModuleRef);
    });

    it("returns undefined for non-existent provider", () => {
      class TestModule {}
      const moduleRef = new (Module as any)(TestModule);

      const result = injector.lookupProvider(Symbol("MISSING"), moduleRef);
      expect(result).toBeUndefined();
    });
  });
});
