/**
 * Unit tests for ApplicationContext public API.
 *
 * Tests: get, getOptional, has, select, close
 *
 * @module __tests__/unit/application-context
 */

import { describe, it, expect, afterEach } from "vitest";

import { ApplicationFactory } from "@/application/application-factory";
import { clearGlobalApplicationContext } from "@/application/global-application";
import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";

describe("ApplicationContext", () => {
  afterEach(() => {
    clearGlobalApplicationContext();
  });

  describe("get()", () => {
    it("resolves a provider by class token", async () => {
      @Injectable()
      class UserService {
        public name = "user-service";
      }

      @Module({ providers: [UserService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const service = app.get(UserService);

      expect(service).toBeInstanceOf(UserService);
      expect(service.name).toBe("user-service");

      await app.close();
    });

    it("resolves a provider by string token", async () => {
      @Module({ providers: [{ provide: "API_URL", useValue: "https://api.test.com" }] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const url = app.get<string>("API_URL");

      expect(url).toBe("https://api.test.com");

      await app.close();
    });

    it("resolves a provider by symbol token", async () => {
      const TOKEN = Symbol("MY_TOKEN");

      @Module({ providers: [{ provide: TOKEN, useValue: 42 }] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const value = app.get<number>(TOKEN);

      expect(value).toBe(42);

      await app.close();
    });

    it("throws when provider is not found", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      expect(() => app.get("NON_EXISTENT")).toThrow(/not found/);

      await app.close();
    });

    it("throws when context is not initialized", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      await app.close();

      expect(() => app.get("ANYTHING")).toThrow(/not initialized/);
    });
  });

  describe("getOptional()", () => {
    it("returns the instance when provider exists", async () => {
      @Injectable()
      class ExistingService {
        public exists = true;
      }

      @Module({ providers: [ExistingService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const service = app.getOptional(ExistingService);

      expect(service).toBeInstanceOf(ExistingService);
      expect(service!.exists).toBe(true);

      await app.close();
    });

    it("returns undefined when provider does not exist", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const result = app.getOptional("MISSING");

      expect(result).toBeUndefined();

      await app.close();
    });
  });

  describe("has()", () => {
    it("returns true when provider is registered", async () => {
      @Injectable()
      class RegisteredService {}

      @Module({ providers: [RegisteredService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      expect(app.has(RegisteredService)).toBe(true);

      await app.close();
    });

    it("returns false when provider is not registered", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      expect(app.has("NOT_REGISTERED")).toBe(false);

      await app.close();
    });
  });

  describe("select()", () => {
    it("returns a scoped context for a specific module", async () => {
      @Injectable()
      class ModuleAService {
        public module = "A";
      }

      @Module({ providers: [ModuleAService] })
      class ModuleA {}

      @Injectable()
      class ModuleBService {
        public module = "B";
      }

      @Module({ providers: [ModuleBService] })
      class ModuleB {}

      @Module({ imports: [ModuleA, ModuleB] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);

      const scopedA = app.select(ModuleA);
      expect(scopedA.get(ModuleAService).module).toBe("A");
      expect(scopedA.has(ModuleBService)).toBe(false);

      const scopedB = app.select(ModuleB);
      expect(scopedB.get(ModuleBService).module).toBe("B");
      expect(scopedB.has(ModuleAService)).toBe(false);

      await app.close();
    });

    it("throws when selecting a non-existent module", async () => {
      @Module({})
      class AppModule {}

      class NonExistentModule {}

      const app = await ApplicationFactory.create(AppModule);

      expect(() => app.select(NonExistentModule)).toThrow(/not found/);

      await app.close();
    });
  });

  describe("close()", () => {
    it("marks the context as not initialized after close", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      await app.close();

      expect(() => app.get("anything")).toThrow(/not initialized/);
    });

    it("passes signal to shutdown hooks", async () => {
      let receivedSignal: string | undefined;

      @Injectable()
      class ShutdownService {
        onApplicationShutdown(signal?: string) {
          receivedSignal = signal;
        }
      }

      @Module({ providers: [ShutdownService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      await app.close("SIGTERM");

      expect(receivedSignal).toBe("SIGTERM");
    });
  });

  describe("getModuleRef()", () => {
    it("returns the module reference for a given class", async () => {
      @Injectable()
      class MyService {}

      @Module({ providers: [MyService] })
      class MyModule {}

      @Module({ imports: [MyModule] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const moduleRef = app.getModuleRef(MyModule);

      expect(moduleRef).toBeDefined();
      expect(moduleRef.metatype).toBe(MyModule);
      expect(moduleRef.providers.has(MyService)).toBe(true);

      await app.close();
    });
  });

  describe("getContainer()", () => {
    it("returns the underlying ModuleContainer", async () => {
      @Module({})
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const container = app.getContainer();

      expect(container).toBeDefined();
      expect(container.getModules().size).toBeGreaterThan(0);

      await app.close();
    });
  });
});
