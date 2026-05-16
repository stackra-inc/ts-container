/**
 * Unit tests for discovery system.
 *
 * Tests: createDecorator, getProviders, getMetadataByDecorator
 *
 * @module __tests__/unit/discovery-system
 */

import { describe, it, expect, afterEach } from "vitest";

import { ApplicationFactory } from "@/application/application-factory";
import { clearGlobalApplicationContext } from "@/application/global-application";
import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { DiscoveryService } from "@/discovery/discovery-service";
import { DiscoveryModule } from "@/discovery/discovery-module";
import { DiscoverableMetaHostCollection } from "@/discovery/discoverable-meta-host-collection";

describe("Discovery System", () => {
  afterEach(() => {
    clearGlobalApplicationContext();
  });

  describe("createDecorator", () => {
    it("returns a decorator with a stable KEY property", () => {
      const MyDecorator = DiscoveryService.createDecorator<{ name: string }>();

      expect(MyDecorator.KEY).toBeDefined();
      expect(typeof MyDecorator.KEY).toBe("string");
      expect(MyDecorator.KEY).toContain("@discoverable:");
    });

    it("generates unique keys for each call", () => {
      const DecoratorA = DiscoveryService.createDecorator();
      const DecoratorB = DiscoveryService.createDecorator();

      expect(DecoratorA.KEY).not.toBe(DecoratorB.KEY);
    });

    it("registers class with DiscoverableMetaHostCollection when applied", () => {
      const MyDecorator = DiscoveryService.createDecorator<{ role: string }>();

      @Injectable()
      @MyDecorator({ role: "admin" })
      class TaggedService {}

      expect(DiscoverableMetaHostCollection.metaHostLinks.has(TaggedService)).toBe(true);
      expect(DiscoverableMetaHostCollection.metaHostLinks.get(TaggedService)).toBe(MyDecorator.KEY);
    });

    it("works as a method decorator without registering in metaHostLinks", () => {
      const MethodDec = DiscoveryService.createDecorator<{ event: string }>();

      @Injectable()
      class TestService {
        @MethodDec({ event: "click" })
        handleClick() {}
      }

      // Method decorators don't register in metaHostLinks
      // The class itself is not tagged
      expect(DiscoverableMetaHostCollection.metaHostLinks.has(TestService)).toBe(false);
    });
  });

  describe("getProviders", () => {
    it("returns all providers when no filter is specified", async () => {
      @Injectable()
      class ServiceA {}

      @Injectable()
      class ServiceB {}

      @Module({ imports: [DiscoveryModule], providers: [ServiceA, ServiceB] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const providers = discovery.getProviders();
      const names = providers.map((w) => w.name);

      expect(names).toContain("ServiceA");
      expect(names).toContain("ServiceB");

      await app.close();
    });

    it("filters providers by metadataKey", async () => {
      const Tagged = DiscoveryService.createDecorator<{ label: string }>();

      @Injectable()
      @Tagged({ label: "tagged" })
      class TaggedService {}

      @Injectable()
      class UntaggedService {}

      @Module({ imports: [DiscoveryModule], providers: [TaggedService, UntaggedService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const tagged = discovery.getProviders({ metadataKey: Tagged.KEY });
      expect(tagged).toHaveLength(1);
      expect(tagged[0]!.metatype).toBe(TaggedService);

      await app.close();
    });

    it("filters providers by include modules", async () => {
      @Injectable()
      class ServiceA {}

      @Module({ providers: [ServiceA], exports: [ServiceA] })
      class ModuleA {}

      @Injectable()
      class ServiceB {}

      @Module({ providers: [ServiceB] })
      class ModuleB {}

      @Module({ imports: [DiscoveryModule, ModuleA, ModuleB] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const filtered = discovery.getProviders({ include: [ModuleA] });
      const names = filtered.map((w) => w.name);

      expect(names).toContain("ServiceA");
      expect(names).not.toContain("ServiceB");

      await app.close();
    });

    it("returns empty array for unregistered metadataKey", async () => {
      const Unused = DiscoveryService.createDecorator();

      @Injectable()
      class SomeService {}

      @Module({ imports: [DiscoveryModule], providers: [SomeService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const result = discovery.getProviders({ metadataKey: Unused.KEY });
      expect(result).toEqual([]);

      await app.close();
    });
  });

  describe("getMetadataByDecorator", () => {
    it("reads class-level metadata from a wrapper", async () => {
      const Role = DiscoveryService.createDecorator<{ name: string }>();

      @Injectable()
      @Role({ name: "admin" })
      class AdminService {}

      @Module({ imports: [DiscoveryModule], providers: [AdminService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const wrappers = discovery.getProviders({ metadataKey: Role.KEY });
      const meta = discovery.getMetadataByDecorator(Role as any, wrappers[0]);

      expect(meta).toEqual({ name: "admin" });

      await app.close();
    });

    it("reads method-level metadata from a wrapper", async () => {
      const Handler = DiscoveryService.createDecorator<{ event: string }>();
      const ClassDec = DiscoveryService.createDecorator<{ type: string }>();

      @Injectable()
      @ClassDec({ type: "controller" })
      class EventController {
        @Handler({ event: "user.created" })
        onUserCreated() {}
      }

      @Module({ imports: [DiscoveryModule], providers: [EventController] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const wrappers = discovery.getProviders({ metadataKey: ClassDec.KEY });
      const methodMeta = discovery.getMetadataByDecorator(
        Handler as any,
        wrappers[0],
        "onUserCreated",
      );

      expect(methodMeta).toEqual({ event: "user.created" });

      await app.close();
    });

    it("returns undefined for non-decorated method", async () => {
      const Handler = DiscoveryService.createDecorator<{ event: string }>();
      const ClassDec = DiscoveryService.createDecorator();

      @Injectable()
      @ClassDec()
      class TestService {
        undecorated() {}
      }

      @Module({ imports: [DiscoveryModule], providers: [TestService] })
      class AppModule {}

      const app = await ApplicationFactory.create(AppModule);
      const discovery = app.get(DiscoveryService);

      const wrappers = discovery.getProviders({ metadataKey: ClassDec.KEY });
      const meta = discovery.getMetadataByDecorator(Handler as any, wrappers[0], "undecorated");

      expect(meta).toBeUndefined();

      await app.close();
    });
  });
});
