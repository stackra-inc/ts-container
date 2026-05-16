/**
 * Unit tests for scope management (Singleton, Transient, Request).
 *
 * Tests: Scope enum values, scope metadata storage, transient behavior
 *
 * @module __tests__/unit/scope-management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getMetadata } from "@vivtel/metadata";

import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { Scope } from "@/enums/scope.enum";
import { SCOPE_OPTIONS_METADATA } from "@/constants";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("Scope Management", () => {
  describe("Scope enum", () => {
    it("should have DEFAULT scope", () => {
      expect(Scope.DEFAULT).toBe("DEFAULT");
    });

    it("should have TRANSIENT scope", () => {
      expect(Scope.TRANSIENT).toBe("TRANSIENT");
    });

    it("should have REQUEST scope", () => {
      expect(Scope.REQUEST).toBe("REQUEST");
    });

    it("should have exactly 3 scope values", () => {
      const values = Object.values(Scope);
      expect(values).toHaveLength(3);
    });
  });

  describe("Scope metadata", () => {
    it("should store DEFAULT scope metadata", () => {
      @Injectable({ scope: Scope.DEFAULT })
      class DefaultService {}

      const options = getMetadata<{ scope: Scope }>(SCOPE_OPTIONS_METADATA, DefaultService);
      expect(options?.scope).toBe(Scope.DEFAULT);
    });

    it("should store TRANSIENT scope metadata", () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {}

      const options = getMetadata<{ scope: Scope }>(SCOPE_OPTIONS_METADATA, TransientService);
      expect(options?.scope).toBe(Scope.TRANSIENT);
    });

    it("should default to undefined scope options (singleton)", () => {
      @Injectable()
      class ImplicitSingleton {}

      const options = getMetadata(SCOPE_OPTIONS_METADATA, ImplicitSingleton);
      expect(options).toBeUndefined();
    });
  });

  describe("Singleton resolution", () => {
    it("should return the same instance for singleton providers", async () => {
      @Injectable()
      class SingletonService {
        public readonly id = Math.random();
      }

      @Module({ providers: [SingletonService], exports: [SingletonService] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const instance1 = app.get(SingletonService);
      const instance2 = app.get(SingletonService);

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(instance2.id);
    });
  });

  describe("Transient resolution", () => {
    it("should create new instances for transient providers", async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {
        public readonly id = Math.random();
      }

      @Module({ providers: [TransientService], exports: [TransientService] })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const instance1 = app.get(TransientService);
      const instance2 = app.get(TransientService);

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).not.toBe(instance2.id);
    });
  });
});
