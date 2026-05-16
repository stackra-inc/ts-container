/**
 * @fileoverview Unit tests for `DiscoverableMetaHostCollection`.
 *
 * Covers the static index that backs `DiscoveryService`'s O(1)
 * `metadataKey` lookups: class-link registration, per-container
 * isolation, idempotent inserts, and the wrapper-to-class fallback
 * for `useValue` / `useFactory` providers.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { ModuleContainer } from "@/injector/container";
import { Module as ModuleRef } from "@/injector/module";
import { InstanceWrapper } from "@/injector/instance-wrapper";
import { DiscoverableMetaHostCollection } from "@/discovery/discoverable-meta-host-collection";

class HostModule {}
class ServiceA {}
class ServiceB {}

describe("DiscoverableMetaHostCollection", () => {
  beforeEach(() => {
    DiscoverableMetaHostCollection.clearClassMetaHostLinks();
  });

  describe("addClassMetaHostLink", () => {
    it("registers a class -> key mapping", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:test-key",
      );
      expect(DiscoverableMetaHostCollection.metaHostLinks.get(ServiceA)).toBe(
        "@discoverable:test-key",
      );
    });

    it("overwrites an existing link with the latest key (matches NestJS behavior)", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:first",
      );
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:second",
      );
      expect(DiscoverableMetaHostCollection.metaHostLinks.get(ServiceA)).toBe(
        "@discoverable:second",
      );
    });
  });

  describe("inspectProvider", () => {
    it("indexes class providers whose metatype is registered", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:k1",
      );

      const container = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const wrapper = new InstanceWrapper({
        token: ServiceA,
        name: ServiceA.name,
        metatype: ServiceA,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);

      const found = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        container,
        "@discoverable:k1",
      );
      expect(Array.from(found)).toEqual([wrapper]);
    });

    it("is a no-op for classes that were never linked", () => {
      const container = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const wrapper = new InstanceWrapper({
        token: ServiceA,
        name: ServiceA.name,
        metatype: ServiceA,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);

      const found = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        container,
        "@discoverable:never-linked",
      );
      expect(found.size).toBe(0);
    });

    it("dedupes the same wrapper across multiple calls", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:dup",
      );

      const container = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const wrapper = new InstanceWrapper({
        token: ServiceA,
        name: ServiceA.name,
        metatype: ServiceA,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);
      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);
      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);

      const found = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        container,
        "@discoverable:dup",
      );
      expect(found.size).toBe(1);
    });

    it("isolates index entries per ModuleContainer", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:iso",
      );

      const containerA = new ModuleContainer();
      const containerB = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const wrapper = new InstanceWrapper({
        token: ServiceA,
        metatype: ServiceA,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(containerA, wrapper);

      expect(
        DiscoverableMetaHostCollection.getProvidersByMetaKey(
          containerA,
          "@discoverable:iso",
        ).size,
      ).toBe(1);
      expect(
        DiscoverableMetaHostCollection.getProvidersByMetaKey(
          containerB,
          "@discoverable:iso",
        ).size,
      ).toBe(0);
    });

    it("falls back to instance.constructor for useValue providers", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:value",
      );

      const container = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const value = new ServiceA();
      const wrapper = new InstanceWrapper({
        token: ServiceA,
        // useValue providers store metatype: null and instance: value at registration
        metatype: null,
        instance: value,
        isResolved: true,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);

      const found = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        container,
        "@discoverable:value",
      );
      expect(Array.from(found)).toEqual([wrapper]);
    });

    it("does not index useFactory providers at scan-time", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:factory",
      );

      const container = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const factory = () => new ServiceA();
      const wrapper = new InstanceWrapper({
        token: "FACTORY_TOKEN",
        // useFactory providers have a function metatype + non-null inject + null instance
        metatype: factory as never,
        inject: [],
        instance: null,
        isResolved: false,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(container, wrapper);

      const found = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        container,
        "@discoverable:factory",
      );
      expect(found.size).toBe(0);
    });
  });

  describe("getProvidersByMetaKey", () => {
    it("returns an empty Set when nothing is registered", () => {
      const container = new ModuleContainer();
      expect(
        DiscoverableMetaHostCollection.getProvidersByMetaKey(
          container,
          "@discoverable:missing",
        ).size,
      ).toBe(0);
    });

    it("returns multiple wrappers for the same key in registration order", () => {
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceA,
        "@discoverable:multi",
      );
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        ServiceB,
        "@discoverable:multi",
      );

      const container = new ModuleContainer();
      const moduleRef = new ModuleRef(HostModule);
      const a = new InstanceWrapper({
        token: ServiceA,
        metatype: ServiceA,
        host: moduleRef,
      });
      const b = new InstanceWrapper({
        token: ServiceB,
        metatype: ServiceB,
        host: moduleRef,
      });

      DiscoverableMetaHostCollection.inspectProvider(container, a);
      DiscoverableMetaHostCollection.inspectProvider(container, b);

      expect(
        Array.from(
          DiscoverableMetaHostCollection.getProvidersByMetaKey(
            container,
            "@discoverable:multi",
          ),
        ),
      ).toEqual([a, b]);
    });
  });
});
