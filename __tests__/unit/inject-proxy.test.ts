/**
 * Unit tests for inject() lazy proxy.
 *
 * Tests: resolution, caching, swap, clearAll
 *
 * @module __tests__/unit/inject-proxy
 */

import { describe, it, expect, afterEach } from "vitest";

import { inject } from "@/inject/inject";
import { ApplicationFactory } from "@/application/application-factory";
import { clearGlobalApplicationContext } from "@/application/global-application";
import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";

describe("inject() lazy proxy", () => {
  afterEach(() => {
    inject.clearAll();
    clearGlobalApplicationContext();
  });

  describe("pre-bootstrap behavior", () => {
    it("throws when accessing properties before bootstrap", () => {
      @Injectable()
      class MyService {
        public value = "test";
      }

      const proxy = inject<MyService>(MyService);

      expect(() => (proxy as any).value).toThrow(/not bootstrapped/);
    });

    it("returns graceful values for toString/valueOf before bootstrap", () => {
      @Injectable()
      class MyService {}

      const proxy = inject<MyService>(MyService);

      expect(proxy.toString()).toContain("inject");
      expect((proxy as any).valueOf()).toBeNull();
    });

    it("returns undefined for React/DevTools inspection properties", () => {
      @Injectable()
      class MyService {}

      const proxy = inject<MyService>(MyService);

      expect((proxy as any).$$typeof).toBeUndefined();
      expect((proxy as any).constructor).toBeUndefined();
      expect((proxy as any).render).toBeUndefined();
    });
  });

  describe("resolution after bootstrap", () => {
    it("resolves the service on first property access", async () => {
      @Injectable()
      class GreetService {
        public greet(name: string): string {
          return `Hello, ${name}`;
        }
      }

      @Module({ providers: [GreetService] })
      class AppModule {}

      await ApplicationFactory.create(AppModule);

      const proxy = inject<GreetService>(GreetService);
      expect(proxy.greet("World")).toBe("Hello, World");
    });

    it("resolves value providers", async () => {
      const TOKEN = "MY_CONFIG";

      @Module({ providers: [{ provide: TOKEN, useValue: { debug: true } }] })
      class AppModule {}

      await ApplicationFactory.create(AppModule);

      const proxy = inject<{ debug: boolean }>(TOKEN as any);
      expect(proxy.debug).toBe(true);
    });
  });

  describe("caching", () => {
    it("caches the resolved instance after first access", async () => {
      let constructCount = 0;

      @Injectable()
      class CountedService {
        constructor() {
          constructCount++;
        }
        public getValue(): number {
          return constructCount;
        }
      }

      @Module({ providers: [CountedService] })
      class AppModule {}

      await ApplicationFactory.create(AppModule);

      const proxy = inject<CountedService>(CountedService);
      proxy.getValue();
      proxy.getValue();
      proxy.getValue();

      // Only constructed once (singleton), and proxy caches the reference
      expect(constructCount).toBe(1);
    });
  });

  describe("swap", () => {
    it("replaces the cached instance with a mock", async () => {
      @Injectable()
      class RealService {
        public getData(): string {
          return "real";
        }
      }

      @Module({ providers: [RealService] })
      class AppModule {}

      await ApplicationFactory.create(AppModule);

      const proxy = inject<RealService>(RealService);
      expect(proxy.getData()).toBe("real");

      // Swap with mock
      inject.swap(RealService, { getData: () => "mocked" });

      const proxy2 = inject<RealService>(RealService);
      expect(proxy2.getData()).toBe("mocked");
    });
  });

  describe("clearAll", () => {
    it("clears all cached instances", async () => {
      @Injectable()
      class ServiceA {
        public name = "A";
      }

      @Injectable()
      class ServiceB {
        public name = "B";
      }

      @Module({ providers: [ServiceA, ServiceB] })
      class AppModule {}

      await ApplicationFactory.create(AppModule);

      const proxyA = inject<ServiceA>(ServiceA);
      const proxyB = inject<ServiceB>(ServiceB);

      // Access to populate cache
      proxyA.name;
      proxyB.name;

      // Swap both
      inject.swap(ServiceA, { name: "swapped-A" });
      inject.swap(ServiceB, { name: "swapped-B" });

      // Clear all
      inject.clearAll();

      // After clear, should re-resolve from container
      const freshA = inject<ServiceA>(ServiceA);
      const freshB = inject<ServiceB>(ServiceB);
      expect(freshA.name).toBe("A");
      expect(freshB.name).toBe("B");
    });
  });

  describe("method binding", () => {
    it("binds methods to the correct this context", async () => {
      @Injectable()
      class ContextService {
        private prefix = "ctx";

        public format(value: string): string {
          return `${this.prefix}:${value}`;
        }
      }

      @Module({ providers: [ContextService] })
      class AppModule {}

      await ApplicationFactory.create(AppModule);

      const proxy = inject<ContextService>(ContextService);
      const { format } = proxy;

      // Even when destructured, `this` should be bound correctly
      expect(format("test")).toBe("ctx:test");
    });
  });
});
