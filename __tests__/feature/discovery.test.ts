/**
 * @fileoverview Feature test — Discovery system end-to-end.
 *
 * Bootstraps a real `ApplicationContext` via `ApplicationFactory.create()`,
 * imports `DiscoveryModule`, registers webhooks under a custom discoverable
 * decorator, and verifies the explorer can list them with the right
 * class- and method-level metadata.
 *
 * Mirrors NestJS's `integration/discovery/e2e/discover-by-meta.spec.ts`.
 */

import { describe, it, expect, afterEach } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/application/application-factory";
import { clearGlobalApplicationContext } from "@/application/global-application";
import { DiscoveryService } from "@/discovery/discovery-service";
import { DiscoveryModule } from "@/discovery/discovery-module";
import { DiscoverableMetaHostCollection } from "@/discovery/discoverable-meta-host-collection";

const Webhook = DiscoveryService.createDecorator<{ name: string }>();
const WebhookHandler = DiscoveryService.createDecorator<{ event: string }>();

@Injectable()
@Webhook({ name: "cleanup" })
class CleanupWebhook {
  @WebhookHandler({ event: "start" })
  onStart() {
    return "cleanup-start";
  }
}

@Injectable()
@Webhook({ name: "flush" })
class FlushWebhook {
  @WebhookHandler({ event: "start" })
  onStart() {
    return "flush-start";
  }
}

@Module({ providers: [CleanupWebhook, FlushWebhook] })
class WebhookModule {}

@Injectable()
class WebhooksExplorer {
  constructor(public readonly discovery: DiscoveryService) {}

  list() {
    return this.discovery.getProviders({ metadataKey: Webhook.KEY }).map((wrapper) => {
      const meta = this.discovery.getMetadataByDecorator(Webhook, wrapper);
      return { name: meta?.name, instance: wrapper.instance };
    });
  }
}

@Module({
  imports: [DiscoveryModule, WebhookModule],
  providers: [WebhooksExplorer],
})
class AppModule {}

describe("Discovery (feature)", () => {
  afterEach(async () => {
    clearGlobalApplicationContext();
  });

  it("discovers every provider tagged by a custom decorator", async () => {
    const app = await ApplicationFactory.create(AppModule);
    const explorer = app.get(WebhooksExplorer);

    const found = explorer.list();
    const names = found.map((f) => f.name).sort();
    expect(names).toEqual(["cleanup", "flush"]);

    // Each entry exposes the live, resolved instance — calling its method
    // returns the real return value, proving DI wired correctly.
    const cleanup = found.find((f) => f.name === "cleanup");
    expect((cleanup?.instance as CleanupWebhook | undefined)?.onStart()).toBe("cleanup-start");

    await app.close();
  });

  it("reads method-level metadata via getMetadataByDecorator", async () => {
    const app = await ApplicationFactory.create(AppModule);
    const discovery = app.get(DiscoveryService);

    const wrappers = discovery.getProviders({ metadataKey: Webhook.KEY });
    const handlers = wrappers.map((wrapper) => ({
      name: discovery.getMetadataByDecorator(Webhook, wrapper)?.name,
      onStart: discovery.getMetadataByDecorator(WebhookHandler, wrapper, "onStart"),
    }));

    expect(handlers).toEqual(
      expect.arrayContaining([
        { name: "cleanup", onStart: { event: "start" } },
        { name: "flush", onStart: { event: "start" } },
      ]),
    );

    await app.close();
  });

  it("returns an empty array for a decorator that was never applied", async () => {
    const Untagged = DiscoveryService.createDecorator();

    const app = await ApplicationFactory.create(AppModule);
    const discovery = app.get(DiscoveryService);

    expect(discovery.getProviders({ metadataKey: Untagged.KEY })).toEqual([]);

    await app.close();
  });

  it("isolates the discovery index per ModuleContainer across apps", async () => {
    // Booting a fresh app should not see providers from a previously
    // closed app — the `WeakMap<ModuleContainer, …>` keying takes care
    // of that automatically once the container is dereferenced.
    const appA = await ApplicationFactory.create(AppModule);
    const containerA = appA.getContainer();
    const cleanupA = appA
      .get(DiscoveryService)
      .getProviders({ metadataKey: Webhook.KEY })
      .map((w) => w.metatype);
    expect(cleanupA).toEqual(expect.arrayContaining([CleanupWebhook, FlushWebhook]));
    await appA.close();
    clearGlobalApplicationContext();

    // Sanity-check that the static index for containerA still matches
    // (we haven't dropped the reference yet).
    expect(
      DiscoverableMetaHostCollection.getProvidersByMetaKey(containerA, Webhook.KEY).size,
    ).toBeGreaterThan(0);

    const appB = await ApplicationFactory.create(AppModule);
    const containerB = appB.getContainer();
    expect(containerA).not.toBe(containerB);
    expect(
      DiscoverableMetaHostCollection.getProvidersByMetaKey(containerB, Webhook.KEY).size,
    ).toBeGreaterThan(0);
    await appB.close();
  });
});
