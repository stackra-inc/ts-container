/**
 * UseDiscoveredOptions Interface
 *
 * Options accepted by the `useDiscovered` React hook.
 *
 * @module interfaces/use-discovered-options
 */

/**
 * Options for the `useDiscovered` hook.
 *
 * @see useDiscovered
 */
export interface UseDiscoveredOptions {
  /**
   * Optional whitelist of module classes. When provided, only providers
   * hosted by one of these modules are returned. Mirrors
   * `DiscoveryService.getProviders({ include })`.
   */
  include?: Function[];
}
