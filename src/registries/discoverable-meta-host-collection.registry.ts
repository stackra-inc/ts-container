/**
 * DiscoverableMetaHostCollection — Static index of provider classes
 * tagged by `DiscoveryService.createDecorator()`.
 *
 * Two stores live here:
 *
 * 1. `metaHostLinks: Map<class, metadataKey>` — process-wide. Populated
 *    when a discoverable decorator is applied at class-level. Stable for
 *    the lifetime of the class reference (which usually lives forever).
 *
 * 2. `providersByMetaKey: WeakMap<ModuleContainer, Map<key, Set<wrapper>>>`
 *    — per-application. Populated by `inspectProvider`, which is called
 *    once per provider during the scanner's registration phase. The outer
 *    `WeakMap` lets the index get garbage-collected together with the
 *    `ModuleContainer` (e.g. between tests).
 *
 * Mirrors NestJS's `DiscoverableMetaHostCollection` at
 * `packages/core/discovery/discoverable-meta-host-collection.ts`, dropping
 * the controller half because this container has no controller concept.
 *
 * @module discovery/discoverable-meta-host-collection
 */

import type { Type } from "@/types/type.type";
import type { ModuleContainer } from "@/registries/container.registry";
import type { InstanceWrapper } from "@/injector/instance-wrapper.class";

/**
 * Static lookup tables for discoverable decorators.
 *
 * Not instantiated — use the static methods directly. The class shape is
 * preserved (rather than a module of free functions) so the API mirrors
 * NestJS's and so it can be referenced by name in error messages and
 * devtools.
 */
export class DiscoverableMetaHostCollection {
  /**
   * Class reference → metadata key.
   *
   * Populated from `DiscoveryService.createDecorator()` when a class is
   * decorated. Each class can map to at most one discoverable key. If
   * multiple discoverable decorators are applied to the same class, the
   * last one wins (matches NestJS behavior; the earlier metadata is still
   * readable via `Reflect.getMetadata`, but the static index only tracks
   * the most recently applied key).
   */
  public static readonly metaHostLinks = new Map<Type | Function, string>();

  /**
   * Per-application reverse index: metadata key → set of provider wrappers.
   *
   * Keyed weakly by the active `ModuleContainer`, so two parallel apps
   * (or successive test apps) never share state, and dropping a
   * `ModuleContainer` reclaims the index automatically.
   */
  private static readonly providersByMetaKey = new WeakMap<
    ModuleContainer,
    Map<string, Set<InstanceWrapper>>
  >();

  /**
   * Register a class → metadata-key link.
   *
   * Called from inside the decorator returned by
   * `DiscoveryService.createDecorator()` whenever the decorator is applied
   * at class level.
   *
   * @param target - The decorated class (or constructor function)
   * @param metadataKey - The key produced by `DiscoveryService.createDecorator()`
   */
  public static addClassMetaHostLink(target: Type | Function, metadataKey: string): void {
    this.metaHostLinks.set(target, metadataKey);
  }

  /**
   * Remove every class → metadata-key link.
   *
   * Primarily useful for tests that register fresh classes for each
   * suite. Production code should never need to call this.
   */
  public static clearClassMetaHostLinks(): void {
    this.metaHostLinks.clear();
  }

  /**
   * Inspect a provider wrapper and add it to the per-container index if
   * its class was registered via {@link addClassMetaHostLink}.
   *
   * Called once per provider during `ModuleContainer.addProvider()`.
   * No-op when the provider's class was never decorated with a
   * discoverable decorator — the common case.
   *
   * @param hostContainerRef - The `ModuleContainer` the provider belongs to
   * @param instanceWrapper - The provider wrapper produced by `Module.addProvider`
   */
  public static inspectProvider(
    hostContainerRef: ModuleContainer,
    instanceWrapper: InstanceWrapper,
  ): void {
    const metaKey = this.getMetaKeyByInstanceWrapper(instanceWrapper);
    if (!metaKey) {
      return;
    }

    let collection = this.providersByMetaKey.get(hostContainerRef);
    if (!collection) {
      collection = new Map<string, Set<InstanceWrapper>>();
      this.providersByMetaKey.set(hostContainerRef, collection);
    }

    this.insertByMetaKey(metaKey, instanceWrapper, collection);
  }

  /**
   * Insert a wrapper into the per-key set, creating the set on demand.
   *
   * Re-inserting the same wrapper is a no-op (Sets dedupe by reference),
   * which makes `inspectProvider` safe to call multiple times — useful in
   * scenarios where the same provider is registered into more than one
   * module via dynamic-module merging.
   *
   * @param metaKey - The discoverable key
   * @param instanceWrapper - The provider wrapper to add
   * @param collection - The per-container key-to-wrappers map
   */
  public static insertByMetaKey(
    metaKey: string,
    instanceWrapper: InstanceWrapper,
    collection: Map<string, Set<InstanceWrapper>>,
  ): void {
    const wrappers = collection.get(metaKey);
    if (wrappers) {
      wrappers.add(instanceWrapper);
      return;
    }
    collection.set(metaKey, new Set([instanceWrapper]));
  }

  /**
   * Look up every provider tagged with the given metadata key for a
   * specific `ModuleContainer`.
   *
   * Returns an empty `Set` when nothing has been registered. Callers
   * typically wrap the result with `Array.from(...)` to expose it as an
   * array.
   *
   * @param hostContainerRef - The `ModuleContainer` to query
   * @param metaKey - The discoverable key to look up
   * @returns A `Set` of `InstanceWrapper`s — possibly empty
   */
  public static getProvidersByMetaKey(
    hostContainerRef: ModuleContainer,
    metaKey: string,
  ): Set<InstanceWrapper> {
    const collection = this.providersByMetaKey.get(hostContainerRef);
    return collection?.get(metaKey) ?? new Set<InstanceWrapper>();
  }

  /**
   * Resolve a wrapper's class reference, falling back through the
   * possible shapes a provider can take.
   *
   * - Class providers — `wrapper.metatype` is the class itself.
   * - Value providers — `wrapper.metatype` is `null`; we fall back to
   *   `wrapper.instance?.constructor` because the value is set at
   *   registration time.
   * - Factory providers — `wrapper.metatype` is the factory function and
   *   `wrapper.inject` is non-null. Falling back to
   *   `wrapper.instance?.constructor` would still point at the produced
   *   instance's class once it has been resolved, but at scan-time the
   *   instance is `null`. Factory-produced classes therefore are not
   *   indexed, which matches NestJS's behavior — there's no decorated
   *   class to associate the wrapper with.
   *
   * @param instanceWrapper - The wrapper to inspect
   * @returns The discoverable key, or `undefined` if the class isn't tagged
   */
  private static getMetaKeyByInstanceWrapper(instanceWrapper: InstanceWrapper): string | undefined {
    // Determine the class reference to look up in metaHostLinks:
    // - Class providers: metatype IS the class — use it directly.
    // - Value providers: metatype is null — fall back to instance.constructor.
    // - Factory providers: metatype is the factory fn + inject is set —
    //   fall back to instance.constructor (null at scan-time → no match).
    let classRef: Function | null | undefined;

    if (instanceWrapper.metatype && !instanceWrapper.inject) {
      // Class provider — metatype IS the decorated class
      classRef = instanceWrapper.metatype as Function;
    } else {
      // Value or factory provider — try instance.constructor
      classRef =
        (instanceWrapper.instance as { constructor?: Function } | null)?.constructor ??
        (instanceWrapper.metatype as Function | null);
    }

    if (!classRef) {
      return undefined;
    }
    return this.metaHostLinks.get(classRef);
  }
}
