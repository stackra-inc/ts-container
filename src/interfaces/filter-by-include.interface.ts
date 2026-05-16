/**
 * FilterByInclude Interface
 *
 * One half of the discriminated union accepted by
 * `DiscoveryService.getProviders()`. Lets callers narrow discovery to a
 * whitelist of module classes.
 *
 * @module interfaces/filter-by-include
 */

/**
 * Whitelist a specific set of module classes during discovery.
 *
 * Only providers whose host module's metatype matches one of the entries
 * in `include` are returned. Useful when you want to scope discovery to
 * a known subset of modules.
 *
 * @example
 * ```typescript
 * discovery.getProviders({ include: [WebhooksModule, JobsModule] });
 * ```
 */
export interface FilterByInclude {
  /**
   * Whitelist of module classes to discover providers from.
   * If empty, no providers are returned.
   */
  include?: Function[];
}
