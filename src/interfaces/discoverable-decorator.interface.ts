/**
 * DiscoverableDecorator Interface
 *
 * The shape returned by `DiscoveryService.createDecorator<T>()`. It is a
 * normal class/method decorator that, in addition, carries a stable `KEY`
 * string used by `DiscoveryService.getProviders({ metadataKey })` and
 * `DiscoveryService.getMetadataByDecorator()` to look up tagged providers
 * and read their metadata back.
 *
 * @module interfaces/discoverable-decorator
 */

/**
 * A decorator factory that emits class/method-level metadata under a
 * unique `KEY` and registers class-level uses with the discovery index.
 *
 * `KEY` is generated once when `DiscoveryService.createDecorator()` runs
 * and is stable for the lifetime of the process. It must be passed to
 * `discovery.getProviders({ metadataKey: MyDecorator.KEY })`.
 *
 * @typeParam T - The shape of the options object passed to the decorator.
 *   Use `void` (or omit) when the decorator takes no arguments.
 *
 * @example
 * ```typescript
 * const Webhook = DiscoveryService.createDecorator<{ name: string }>();
 *
 * Webhook.KEY;            // → '@discoverable:7f1c…'
 * @Webhook({ name: 'x' }) // → ClassDecorator + writes metadata
 * class MyWebhook {}
 * ```
 */
export type DiscoverableDecorator<T> = ((opts?: T) => ClassDecorator & MethodDecorator) & {
  /**
   * The unique metadata key used by this decorator.
   *
   * Pass it to `DiscoveryService.getProviders({ metadataKey })` to find
   * tagged providers, and `getMetadataByDecorator()` to read metadata back.
   */
  readonly KEY: string;
};
