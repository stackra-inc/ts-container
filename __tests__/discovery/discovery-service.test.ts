/**
 * @fileoverview Unit tests for `DiscoveryService`.
 *
 * Covers `createDecorator`, `getProviders` (default, `metadataKey`, and
 * `include` paths), and `getMetadataByDecorator` (class-level and
 * method-level reads). Uses the real container and module so these are
 * integration-level — but cheap because no async resolution is required.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { ModuleContainer } from "@/injector/container";
import { Module as ModuleRef } from "@/injector/module";
import { InstanceWrapper } from "@/injector/instance-wrapper";
import { DiscoveryService } from "@/discovery/discovery-service";
import { DiscoverableMetaHostCollection } from "@/discovery/discoverable-meta-host-collection";
import { DISCOVERABLE_DECORATOR_KEY_PREFIX } from "@/constants";

class ModuleA {}
class ModuleB {}

describe("DiscoveryService", () => {
  let container: ModuleContainer;
  let discovery: DiscoveryService;

  beforeEach(() => {
    DiscoverableMetaHostCollection.clearClassMetaHostLinks();
    container = new ModuleContainer();
    discovery = new DiscoveryService(container);
  });

  describe("createDecorator", () => {
    it("produces unique KEYs across calls", () => {
      const A = DiscoveryService.createDecorator();
      const B = DiscoveryService.createDecorator();
      expect(A.KEY).not.toBe(B.KEY);
      expect(A.KEY.startsWith(DISCOVERABLE_DECORATOR_KEY_PREFIX)).toBe(true);
    });

    it("returns a non-writable, enumerable KEY", () => {
      const Deco = DiscoveryService.createDecorator();
      const descriptor = Object.getOwnPropertyDescriptor(Deco, "KEY");
      expect(descriptor?.writable).toBe(false);
      expect(descriptor?.enumerable).toBe(true);
      expect(descriptor?.configurable).toBe(false);
    });

    it("registers the class with DiscoverableMetaHostCollection on class-level use", () => {
      const Deco = DiscoveryService.createDecorator<{ name: string }>();

      @Deco({ name: "klass" })
      class Klass {}

      expect(DiscoverableMetaHostCollection.metaHostLinks.get(Klass)).toBe(
        Deco.KEY,
      );
    });

    it("does not register the class for method-level use", () => {
      const Deco = DiscoveryService.createDecorator<{ event: string }>();

      class Owner {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        @Deco({ event: "ping" }) handler() {}
      }

      expect(DiscoverableMetaHostCollection.metaHostLinks.has(Owner)).toBe(
        false,
      );
    });

    it("defaults options to an empty object when called without args", () => {
      const Deco = DiscoveryService.createDecorator();

      @Deco()
      class Klass {}

      class Owner {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        @Deco() handler() {}
      }

      // Read back via Reflect (the service's getMetadataByDecorator covers
      // the typed read in its own test).
      expect(Reflect.getMetadata(Deco.KEY, Klass)).toEqual({});
      expect(Reflect.getMetadata(Deco.KEY, Owner.prototype.handler)).toEqual(
        {},
      );
    });
  });

  describe("getProviders — default (no filter)", () => {
    it("flattens every provider in every registered module", async () => {
      const moduleA = new ModuleRef(ModuleA);
      const moduleB = new ModuleRef(ModuleB);
      moduleA.token = "ModuleA";
      moduleB.token = "ModuleB";
      container.getModules().set("ModuleA", moduleA);
      container.getModules().set("ModuleB", moduleB);

      class S1 {}
      class S2 {}
      class S3 {}
      moduleA.addProvider(S1);
      moduleA.addProvider(S2);
      moduleB.addProvider(S3);

      const wrappers = discovery.getProviders();
      // Each module has its own metatype + ModuleRef + ApplicationConfig core
      // providers added by `Module.addCoreProviders`. We only assert our own.
      const tokens = wrappers.map((w) => w.token);
      expect(tokens).toContain(S1);
      expect(tokens).toContain(S2);
      expect(tokens).toContain(S3);
    });

    it("returns an empty array when no modules are registered", () => {
      expect(discovery.getProviders()).toEqual([]);
    });
  });

  describe("getProviders — { metadataKey }", () => {
    it("returns wrappers tagged by a discoverable decorator", () => {
      const Tag = DiscoveryService.createDecorator<{ id: string }>();

      @Tag({ id: "alpha" })
      class Tagged {}

      const moduleRef = new ModuleRef(ModuleA);
      moduleRef.token = "ModuleA";
      container.getModules().set("ModuleA", moduleRef);
      container.addProvider(Tagged, "ModuleA");

      const result = discovery.getProviders({ metadataKey: Tag.KEY });
      expect(result).toHaveLength(1);
      expect(result[0]?.metatype).toBe(Tagged);
    });

    it("returns an empty array when no provider was tagged", () => {
      const Tag = DiscoveryService.createDecorator();
      const result = discovery.getProviders({ metadataKey: Tag.KEY });
      expect(result).toEqual([]);
    });

    it("returns wrappers from any module the same key was used in", () => {
      const Tag = DiscoveryService.createDecorator();

      @Tag()
      class A {}
      @Tag()
      class B {}

      const moduleA = new ModuleRef(ModuleA);
      const moduleB = new ModuleRef(ModuleB);
      moduleA.token = "ModuleA";
      moduleB.token = "ModuleB";
      container.getModules().set("ModuleA", moduleA);
      container.getModules().set("ModuleB", moduleB);
      container.addProvider(A, "ModuleA");
      container.addProvider(B, "ModuleB");

      const result = discovery.getProviders({ metadataKey: Tag.KEY });
      expect(result.map((w) => w.metatype)).toEqual(
        expect.arrayContaining([A, B]),
      );
    });
  });

  describe("getProviders — { include }", () => {
    it("returns providers only from whitelisted modules", () => {
      const moduleA = new ModuleRef(ModuleA);
      const moduleB = new ModuleRef(ModuleB);
      moduleA.token = "ModuleA";
      moduleB.token = "ModuleB";
      container.getModules().set("ModuleA", moduleA);
      container.getModules().set("ModuleB", moduleB);

      class S1 {}
      class S2 {}
      moduleA.addProvider(S1);
      moduleB.addProvider(S2);

      const result = discovery.getProviders({ include: [ModuleA] });
      const tokens = result.map((w) => w.token);
      expect(tokens).toContain(S1);
      expect(tokens).not.toContain(S2);
    });

    it("returns an empty array when include is an empty list", () => {
      const moduleA = new ModuleRef(ModuleA);
      moduleA.token = "ModuleA";
      container.getModules().set("ModuleA", moduleA);

      class S1 {}
      moduleA.addProvider(S1);

      expect(discovery.getProviders({ include: [] })).toEqual([]);
    });
  });

  describe("getMetadataByDecorator", () => {
    it("reads class-level metadata via instance.constructor when present", () => {
      const Tag = DiscoveryService.createDecorator<{ name: string }>();

      @Tag({ name: "alpha" })
      class Klass {}

      const moduleRef = new ModuleRef(ModuleA);
      const wrapper = new InstanceWrapper({
        token: Klass,
        metatype: Klass,
        instance: new Klass(),
        isResolved: true,
        host: moduleRef,
      });

      expect(discovery.getMetadataByDecorator(Tag, wrapper)).toEqual({
        name: "alpha",
      });
    });

    it("falls back to wrapper.metatype when instance is null", () => {
      const Tag = DiscoveryService.createDecorator<{ id: number }>();

      @Tag({ id: 42 })
      class Klass {}

      const moduleRef = new ModuleRef(ModuleA);
      const wrapper = new InstanceWrapper({
        token: Klass,
        metatype: Klass,
        instance: null,
        isResolved: false,
        host: moduleRef,
      });

      expect(discovery.getMetadataByDecorator(Tag, wrapper)).toEqual({
        id: 42,
      });
    });

    it("returns undefined when the wrapper isn't tagged", () => {
      const Tag = DiscoveryService.createDecorator();

      class Plain {}

      const moduleRef = new ModuleRef(ModuleA);
      const wrapper = new InstanceWrapper({
        token: Plain,
        metatype: Plain,
        instance: new Plain(),
        isResolved: true,
        host: moduleRef,
      });

      expect(discovery.getMetadataByDecorator(Tag, wrapper)).toBeUndefined();
    });

    it("reads method-level metadata when methodKey is provided", () => {
      const Tag = DiscoveryService.createDecorator<{ event: string }>();

      class Owner {
        @Tag({ event: "ping" })
        handler() {
          return "ok";
        }
      }

      const moduleRef = new ModuleRef(ModuleA);
      const wrapper = new InstanceWrapper({
        token: Owner,
        metatype: Owner,
        instance: new Owner(),
        isResolved: true,
        host: moduleRef,
      });

      expect(discovery.getMetadataByDecorator(Tag, wrapper, "handler")).toEqual(
        { event: "ping" },
      );
    });

    it("returns undefined when methodKey doesn't exist on the instance", () => {
      const Tag = DiscoveryService.createDecorator();

      class Owner {}

      const moduleRef = new ModuleRef(ModuleA);
      const wrapper = new InstanceWrapper({
        token: Owner,
        metatype: Owner,
        instance: new Owner(),
        isResolved: true,
        host: moduleRef,
      });

      expect(
        discovery.getMetadataByDecorator(Tag, wrapper, "missing"),
      ).toBeUndefined();
    });
  });
});
