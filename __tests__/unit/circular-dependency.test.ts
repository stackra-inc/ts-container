/**
 * Unit tests for circular dependency detection.
 *
 * @module __tests__/unit/circular-dependency
 */

import { describe, it, expect, beforeEach } from "vitest";
import { defineMetadata } from "@vivtel/metadata";

import { Injector } from "@/injector/injector";
import { Module } from "@/injector/module";
import { Injectable } from "@/decorators/injectable.decorator";
import { PARAMTYPES_METADATA } from "@/constants";

describe("Circular Dependency Detection", () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new (Injector as any)();
  });

  it("detects direct circular dependency (A → B → A)", async () => {
    @Injectable()
    class ServiceA {
      constructor(public b: any) {}
    }

    @Injectable()
    class ServiceB {
      constructor(public a: any) {}
    }

    defineMetadata(PARAMTYPES_METADATA, [ServiceB], ServiceA);
    defineMetadata(PARAMTYPES_METADATA, [ServiceA], ServiceB);

    class TestModule {}
    const moduleRef = new (Module as any)(TestModule);
    moduleRef.addProvider(ServiceA);
    moduleRef.addProvider(ServiceB);

    await expect(injector.resolveProviders(moduleRef)).rejects.toThrow(
      /Circular dependency detected/,
    );
  });

  it("detects indirect circular dependency (A → B → C → A)", async () => {
    @Injectable()
    class ServiceA {
      constructor(public b: any) {}
    }

    @Injectable()
    class ServiceB {
      constructor(public c: any) {}
    }

    @Injectable()
    class ServiceC {
      constructor(public a: any) {}
    }

    defineMetadata(PARAMTYPES_METADATA, [ServiceB], ServiceA);
    defineMetadata(PARAMTYPES_METADATA, [ServiceC], ServiceB);
    defineMetadata(PARAMTYPES_METADATA, [ServiceA], ServiceC);

    class TestModule {}
    const moduleRef = new (Module as any)(TestModule);
    moduleRef.addProvider(ServiceA);
    moduleRef.addProvider(ServiceB);
    moduleRef.addProvider(ServiceC);

    await expect(injector.resolveProviders(moduleRef)).rejects.toThrow(
      /Circular dependency detected/,
    );
  });

  it("includes the resolution chain in the error message", async () => {
    @Injectable()
    class Alpha {
      constructor(public dep: any) {}
    }

    @Injectable()
    class Beta {
      constructor(public dep: any) {}
    }

    defineMetadata(PARAMTYPES_METADATA, [Beta], Alpha);
    defineMetadata(PARAMTYPES_METADATA, [Alpha], Beta);

    class TestModule {}
    const moduleRef = new (Module as any)(TestModule);
    moduleRef.addProvider(Alpha);
    moduleRef.addProvider(Beta);

    try {
      await injector.resolveProviders(moduleRef);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).toContain("Alpha");
      expect(err.message).toContain("Beta");
      expect(err.message).toContain("→");
    }
  });

  it("does not false-positive on diamond dependencies", async () => {
    @Injectable()
    class SharedService {
      public value = "shared";
    }

    @Injectable()
    class ServiceA {
      constructor(public shared: SharedService) {}
    }

    @Injectable()
    class ServiceB {
      constructor(public shared: SharedService) {}
    }

    @Injectable()
    class RootService {
      constructor(
        public a: ServiceA,
        public b: ServiceB,
      ) {}
    }

    defineMetadata(PARAMTYPES_METADATA, [SharedService], ServiceA);
    defineMetadata(PARAMTYPES_METADATA, [SharedService], ServiceB);
    defineMetadata(PARAMTYPES_METADATA, [ServiceA, ServiceB], RootService);

    class TestModule {}
    const moduleRef = new (Module as any)(TestModule);
    moduleRef.addProvider(SharedService);
    moduleRef.addProvider(ServiceA);
    moduleRef.addProvider(ServiceB);
    moduleRef.addProvider(RootService);

    await expect(injector.resolveProviders(moduleRef)).resolves.not.toThrow();

    const wrapper = moduleRef.providers.get(RootService);
    expect(wrapper!.isResolved).toBe(true);
    expect(wrapper!.instance.a.shared).toBe(wrapper!.instance.b.shared);
  });

  it("self-referencing dependency is detected", async () => {
    @Injectable()
    class SelfRef {
      constructor(public self: any) {}
    }

    defineMetadata(PARAMTYPES_METADATA, [SelfRef], SelfRef);

    class TestModule {}
    const moduleRef = new (Module as any)(TestModule);
    moduleRef.addProvider(SelfRef);

    await expect(injector.resolveProviders(moduleRef)).rejects.toThrow(
      /Circular dependency detected/,
    );
  });
});
