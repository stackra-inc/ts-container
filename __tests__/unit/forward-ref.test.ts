/**
 * Unit tests for forwardRef utility.
 *
 * Tests: Forward reference resolution, lazy class references
 *
 * @module __tests__/unit/forward-ref
 */

import { describe, it, expect } from "vitest";

import { forwardRef } from "@/utils/forward-ref.util";
import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("forwardRef", () => {
  describe("Basic forwardRef", () => {
    it("should create a forward reference object", () => {
      class LazyClass {}
      const ref = forwardRef(() => LazyClass);

      expect(ref).toHaveProperty("forwardRef");
      expect(typeof ref.forwardRef).toBe("function");
      expect(ref.forwardRef()).toBe(LazyClass);
    });

    it("should resolve forward references during injection", async () => {
      @Injectable()
      class ServiceB {
        getValue() {
          return "B";
        }
      }

      @Injectable()
      class ServiceA {
        constructor(@Inject(forwardRef(() => ServiceB)) public b: ServiceB) {}
      }

      @Module({ providers: [ServiceA, ServiceB] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const serviceA = app.get(ServiceA);

      expect(serviceA.b).toBeInstanceOf(ServiceB);
      expect(serviceA.b.getValue()).toBe("B");
    });
  });

  describe("forwardRef with symbols", () => {
    it("should work with symbol tokens", async () => {
      const TOKEN = Symbol("FORWARD_TOKEN");

      @Injectable()
      class ServiceWithForwardRef {
        constructor(@Inject(forwardRef(() => TOKEN as any)) public dep: any) {}
      }

      @Module({
        providers: [{ provide: TOKEN, useValue: "forward-resolved" }, ServiceWithForwardRef],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const service = app.get(ServiceWithForwardRef);

      expect(service.dep).toBe("forward-resolved");
    });
  });
});
