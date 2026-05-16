/**
 * Unit tests for LazyModuleLoader.
 *
 * Tests: load new module, return existing, lifecycle hooks on new modules
 *
 * @module __tests__/unit/lazy-module-loader
 */

import { describe, it, expect, afterEach, vi } from "vitest";

import { ApplicationFactory } from "@/application/application-factory";
import { clearGlobalApplicationContext } from "@/application/global-application";
import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { LazyModuleLoader } from "@/injector/lazy-module-loader";
import { ModuleContainer } from "@/injector/container";

describe("LazyModuleLoader", () => {
  afterEach(() => {
    clearGlobalApplicationContext();
  });

  it("loads a new module at runtime", async () => {
    @Injectable()
    class LazyService {
      public value = "lazy-loaded";
    }

    @Module({ providers: [LazyService], exports: [LazyService] })
    class LazyModule {}

    @Module({ providers: [LazyModuleLoader] })
    class AppModule {}

    const app = await ApplicationFactory.create(AppModule);
    const container = app.get(ModuleContainer);
    const loader = new (LazyModuleLoader as any)(container);

    const moduleRef = await loader.load(() => LazyModule);

    const wrapper = moduleRef.getProviderByToken(LazyService);
    expect(wrapper).toBeDefined();
    expect(wrapper!.isResolved).toBe(true);
    expect(wrapper!.instance).toBeInstanceOf(LazyService);
    expect(wrapper!.instance!.value).toBe("lazy-loaded");

    await app.close();
  });

  it("returns existing module if already registered", async () => {
    @Injectable()
    class ExistingService {
      public value = "existing";
    }

    @Module({ providers: [ExistingService], exports: [ExistingService] })
    class ExistingModule {}

    @Module({ imports: [ExistingModule] })
    class AppModule {}

    const app = await ApplicationFactory.create(AppModule);
    const container = app.get(ModuleContainer);
    const loader = new (LazyModuleLoader as any)(container);

    const moduleRef = await loader.load(() => ExistingModule);

    // Should return the already-registered module
    const wrapper = moduleRef.getProviderByToken(ExistingService);
    expect(wrapper).toBeDefined();
    expect(wrapper!.isResolved).toBe(true);
    expect(wrapper!.instance!.value).toBe("existing");

    await app.close();
  });

  it("runs lifecycle hooks on newly loaded module providers", async () => {
    const initFn = vi.fn();

    @Injectable()
    class LazyInitService {
      onModuleInit() {
        initFn();
      }
    }

    @Module({ providers: [LazyInitService] })
    class LazyModule {}

    @Module({})
    class AppModule {}

    const app = await ApplicationFactory.create(AppModule);
    const container = app.get(ModuleContainer);
    const loader = new (LazyModuleLoader as any)(container);

    expect(initFn).not.toHaveBeenCalled();

    await loader.load(() => LazyModule);

    expect(initFn).toHaveBeenCalled();

    await app.close();
  });

  it("does NOT re-run lifecycle hooks on existing modules", async () => {
    const existingInitFn = vi.fn();

    @Injectable()
    class ExistingService {
      onModuleInit() {
        existingInitFn();
      }
    }

    @Module({ providers: [ExistingService], exports: [ExistingService] })
    class ExistingModule {}

    @Injectable()
    class LazyService {
      public loaded = true;
    }

    @Module({ providers: [LazyService] })
    class LazyModule {}

    @Module({ imports: [ExistingModule] })
    class AppModule {}

    const app = await ApplicationFactory.create(AppModule);
    // existingInitFn called once during bootstrap
    expect(existingInitFn).toHaveBeenCalledTimes(1);

    const container = app.get(ModuleContainer);
    const loader = new (LazyModuleLoader as any)(container);

    await loader.load(() => LazyModule);

    // Should NOT have been called again
    expect(existingInitFn).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it("supports async module factory (dynamic import pattern)", async () => {
    @Injectable()
    class AsyncService {
      public loaded = true;
    }

    @Module({ providers: [AsyncService] })
    class AsyncModule {}

    @Module({})
    class AppModule {}

    const app = await ApplicationFactory.create(AppModule);
    const container = app.get(ModuleContainer);
    const loader = new (LazyModuleLoader as any)(container);

    const moduleRef = await loader.load(async () => {
      // Simulate dynamic import
      await new Promise((r) => setTimeout(r, 5));
      return AsyncModule;
    });

    const wrapper = moduleRef.getProviderByToken(AsyncService);
    expect(wrapper!.instance!.loaded).toBe(true);

    await app.close();
  });

  it("supports dynamic module (forFeature pattern)", async () => {
    const FEATURE_CONFIG = Symbol("FEATURE_CONFIG");

    @Module({
      providers: [{ provide: FEATURE_CONFIG, useValue: { key: "default" } }],
    })
    class FeatureModule {}

    @Module({})
    class AppModule {}

    const app = await ApplicationFactory.create(AppModule);
    const container = app.get(ModuleContainer);
    const loader = new (LazyModuleLoader as any)(container);

    const moduleRef = await loader.load(() => FeatureModule);

    const wrapper = moduleRef.getProviderByToken(FEATURE_CONFIG);
    expect(wrapper).toBeDefined();
    expect(wrapper!.instance).toEqual({ key: "default" });

    await app.close();
  });
});
