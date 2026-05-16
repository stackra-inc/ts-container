/**
 * FilterByMetadataKey Interface
 *
 * The other half of the discriminated union accepted by
 * `DiscoveryService.getProviders()`. Lets callers query the per-container
 * reverse index keyed by a discoverable decorator's `KEY`.
 *
 * @module interfaces/filter-by-metadata-key
 */

/**
 * Filter providers by a metadata key produced by `DiscoveryService.createDecorator()`.
 *
 * Resolved in O(1) via the static `DiscoverableMetaHostCollection` index
 * that is populated as `ModuleContainer.addProvider` registers each provider.
 *
 * @example
 * ```typescript
 * const Webhook = DiscoveryService.createDecorator<{ name: string }>();
 *
 * @Injectable()
 * @Webhook({ name: 'flush' })
 * class FlushWebhook {}
 *
 * discovery.getProviders({ metadataKey: Webhook.KEY });
 * ```
 */
export interface FilterByMetadataKey {
  /**
   * Metadata key produced by `DiscoveryService.createDecorator()`.
   * Only providers tagged with this exact key are returned.
   */
  metadataKey?: string;
}
