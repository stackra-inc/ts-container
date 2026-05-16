/**
 * DiscoveryOptions Type
 *
 * Discriminated union of the two filter shapes accepted by
 * `DiscoveryService.getProviders()`. Either pass an `include` whitelist
 * of module classes, a `metadataKey` produced by
 * `DiscoveryService.createDecorator()`, or an empty object to walk every
 * module.
 *
 * @module types/discovery-options
 */

import type { FilterByInclude } from "@/interfaces/filter-by-include.interface";
import type { FilterByMetadataKey } from "@/interfaces/filter-by-metadata-key.interface";

/**
 * Discriminated union of the two discovery filter shapes.
 *
 * @see FilterByInclude
 * @see FilterByMetadataKey
 */
export type DiscoveryOptions = FilterByInclude | FilterByMetadataKey;
