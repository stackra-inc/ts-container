/**
 * DiscoveryService — Public API for finding providers in the module graph.
 *
 * Mirrors NestJS's `DiscoveryService` from
 * `packages/core/discovery/discovery-service.ts`, with the controller half
 * dropped because this container has no controller concept.
 *
 * Three responsibilities:
 *
 * 1. **Decorator factory** — `DiscoveryService.createDecorator<T>()` returns
 *    a class/method decorator with a stable `KEY`. At decoration time the
 *    decorator writes options under that key and registers the class with
 *    {@link DiscoverableMetaHostCollection}.
 *
 * 2. **Provider lookup** — `getProviders()` returns every `InstanceWrapper`
 *    in the running container, optionally filtered by a metadata key
 *    (O(1) via the static index) or a whitelist of module classes.
 *
 * 3. **Metadata read-back** — `getMetadataByDecorator()` reads the options
 *    a class or method was tagged with, so consumers can introspect the
 *    payload without poking at `Reflect` directly.
 *
 * @module discovery/discovery-service
 */

import { defineMetadata, getMetadata } from "@vivtel/metadata";

import { Injectable } from "@/decorators/injectable.decorator";
import { ModuleContainer } from "@/registries/container.registry";
import { generateMetadataKey } from "@/utils/generate-metadata-key.util";
import type { Module } from "@/injector/module.class";
import type { InstanceWrapper } from "@/injector/instance-wrapper.class";
import type { DiscoveryOptions } from "@/types/discovery-options.type";
import type { DiscoverableDecorator } from "@/interfaces/discoverable-decorator.interface";
import { DiscoverableMetaHostCollection } from "@/registries/discoverable-meta-host-collection.registry";

/**
 * Public service for discovering providers tagged with custom decorators.
 *
 * Inject it anywhere — `DiscoveryModule` is global, so importing it once
 * at the root makes the service available throughout the app:
 *
 * @example
 * ```typescript
 * @Module({ imports: [DiscoveryModule] })
 * class AppModule {}
 *
 * const Webhook = DiscoveryService.createDecorator<{ name: string }>();
 *
 * @Injectable() @Webhook({ name: 'flush' })
 * class FlushWebhook {
 *   @Webhook({ name: 'flush.start' })
 *   onStart() {}
 * }
 *
 * @Injectable()
 * class WebhooksExplorer {
 *   constructor(private readonly discovery: DiscoveryService) {}
 *
 *   list() {
 *     return this.discovery
 *       .getProviders({ metadataKey: Webhook.KEY })
 *       .map((wrapper) => ({
 *         instance: wrapper.instance,
 *         metadata: this.discovery.getMetadataByDecorator(Webhook, wrapper),
 *       }));
 *   }
 * }
 * ```
 */
@Injectable()
export class DiscoveryService {
  /**
   * Create a new `DiscoveryService` instance.
   *
   * The container is normally injected automatically — `ApplicationFactory.create()`
   * registers `ModuleContainer` as a value provider on every module so any
   * module that imports `DiscoveryModule` can resolve it.
   *
   * @param modulesContainer - The active `ModuleContainer`
   */
  constructor(private readonly modulesContainer: ModuleContainer) {}

  /**
   * Create a discoverable class/method decorator.
   *
   * Each call generates a unique metadata key. The returned decorator:
   *
   * - At class level: writes the options under `KEY` on the class **and**
   *   registers the class with {@link DiscoverableMetaHostCollection} so
   *   it can be looked up by `getProviders({ metadataKey })`.
   *
   * - At method level: writes the options under `KEY` on the method's
   *   property descriptor value (the function). Methods are not registered
   *   with the static index — use `getMetadataByDecorator(decorator, wrapper, methodKey)`
   *   to read method-level metadata back.
   *
   * `opts` defaults to an empty object when omitted, mirroring NestJS's
   * behavior — `Reflect.getMetadata(KEY, target)` then returns `{}` rather
   * than `undefined`, which simplifies consumer code.
   *
   * @typeParam T - Shape of the options object
   * @returns A class/method decorator with a stable `KEY` property
   *
   * @example
   * ```typescript
   * const Webhook = DiscoveryService.createDecorator<{ name: string }>();
   *
   * @Webhook({ name: 'flush' })
   * class FlushWebhook {}
   *
   * Webhook.KEY; // → '@discoverable:7f1c8b40-…'
   * ```
   */
  static createDecorator<T = object>(): DiscoverableDecorator<T> {
    const metadataKey = generateMetadataKey();

    const decorator = ((opts?: T) => {
      const value = (opts ?? {}) as object;
      return ((
        target: object | Function,
        propertyKey?: string | symbol,
        descriptor?: PropertyDescriptor,
      ) => {
        if (descriptor && propertyKey !== undefined) {
          // Method-level — write metadata onto the function itself.
          defineMetadata(metadataKey, value, descriptor.value as object);
          return descriptor;
        }

        // Class-level — register with the host collection and write the
        // metadata onto the constructor.
        DiscoverableMetaHostCollection.addClassMetaHostLink(target as Function, metadataKey);
        defineMetadata(metadataKey, value, target as object);
        return target;
      }) as ClassDecorator & MethodDecorator;
    }) as DiscoverableDecorator<T>;

    Object.defineProperty(decorator, "KEY", {
      value: metadataKey,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    return decorator;
  }

  /**
   * Find provider wrappers in the running container.
   *
   * Three modes:
   *
   * - `getProviders()` — every provider in every module, flattened.
   * - `getProviders({ include: [SomeModule, ...] })` — providers from a
   *   whitelist of module classes only.
   * - `getProviders({ metadataKey: SomeDecorator.KEY })` — providers whose
   *   class was decorated with `SomeDecorator`. Resolved in O(1) via the
   *   static `DiscoverableMetaHostCollection` index.
   *
   * The `metadataKey` and `include` options are mutually exclusive — when
   * `metadataKey` is present it takes precedence and `modules` is ignored,
   * matching NestJS.
   *
   * @param options - Discovery filter
   * @param modules - Optional pre-computed module list (used internally)
   * @returns Array of `InstanceWrapper`s — possibly empty
   */
  public getProviders(
    options: DiscoveryOptions = {},
    modules: Module[] = this.getModules(options),
  ): InstanceWrapper[] {
    if ("metadataKey" in options && options.metadataKey) {
      const wrappers = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        this.modulesContainer,
        options.metadataKey,
      );
      return Array.from(wrappers);
    }

    const result: InstanceWrapper[] = [];
    for (const moduleRef of modules) {
      for (const wrapper of moduleRef.providers.values()) {
        result.push(wrapper);
      }
    }
    return result;
  }

  /**
   * Read the metadata that was attached to a wrapper by a discoverable
   * decorator.
   *
   * Without `methodKey`, reads class-level metadata from
   * `wrapper.instance.constructor` (so `useValue` / `useFactory` providers
   * resolve to the actual class) or `wrapper.metatype` as a fallback.
   *
   * With `methodKey`, reads method-level metadata from
   * `wrapper.instance[methodKey]`. The wrapper must be resolved at this
   * point (which is always the case after `ApplicationFactory.create()` returns).
   *
   * @typeParam D - The decorator type, used to infer the options shape
   * @param decorator - The decorator factory whose `KEY` to look up
   * @param wrapper - A wrapper returned by `getProviders()`
   * @param methodKey - Optional method name for method-level metadata
   * @returns The options object, or `undefined` if the wrapper isn't tagged
   */
  public getMetadataByDecorator<D extends DiscoverableDecorator<unknown>>(
    decorator: D,
    wrapper: InstanceWrapper,
    methodKey?: string,
  ): (D extends DiscoverableDecorator<infer R> ? R : unknown) | undefined {
    if (methodKey) {
      const instance = wrapper.instance as Record<string, unknown> | null;
      const method = instance?.[methodKey];
      if (typeof method !== "function") {
        return undefined;
      }
      return getMetadata(decorator.KEY, method as object) as any;
    }

    const classRef =
      (wrapper.instance as { constructor?: Function } | null)?.constructor ?? wrapper.metatype;
    if (!classRef) {
      return undefined;
    }
    return getMetadata(decorator.KEY, classRef as object) as any;
  }

  /**
   * Resolve the module list to walk for `getProviders()` without a
   * `metadataKey` filter.
   *
   * @param options - The original discovery options
   * @returns Modules in the container, or a whitelisted subset
   */
  protected getModules(options: DiscoveryOptions = {}): Module[] {
    if (!("include" in options) || !options.include) {
      return [...this.modulesContainer.getModules().values()];
    }
    const whitelist = options.include;
    const matches: Module[] = [];
    for (const moduleRef of this.modulesContainer.getModules().values()) {
      if (whitelist.some((cls: Function) => cls === moduleRef.metatype)) {
        matches.push(moduleRef);
      }
    }
    return matches;
  }
}
