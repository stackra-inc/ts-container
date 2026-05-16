/**
 * useDiscovered Hook
 *
 * Subscribe to providers tagged with a discoverable decorator. The result
 * is memoized on `(decorator, include)` — re-renders that don't change
 * the inputs return the same array reference, so the hook is safe to use
 * as a dependency in `useEffect` / `useMemo`.
 *
 * @module hooks/use-discovered
 */

import { useMemo } from "react";

import { useDiscovery } from "@/hooks/use-discovery";
import type { InstanceWrapper } from "@/injector/instance-wrapper.class";
import type { DiscoverableDecorator } from "@/interfaces/discoverable-decorator.interface";
import type { UseDiscoveredOptions } from "@/interfaces/use-discovered-options.interface";

/**
 * Get every `InstanceWrapper` tagged with `decorator` from the active
 * container.
 *
 * The wrapper exposes `instance`, `metatype`, `host`, `scope`, etc., so
 * consumers can read metadata back via
 * `discovery.getMetadataByDecorator(decorator, wrapper)` and call
 * methods on `wrapper.instance` directly.
 *
 * @typeParam T - Options shape inferred from the decorator
 * @param decorator - A decorator returned by `DiscoveryService.createDecorator()`
 * @param options - Optional `include` whitelist
 * @returns Array of `InstanceWrapper`s; empty when nothing is tagged
 *
 * @example
 * ```tsx
 * const Webhook = DiscoveryService.createDecorator<{ name: string }>();
 *
 * function WebhookList() {
 *   const webhooks = useDiscovered(Webhook);
 *   const discovery = useDiscovery();
 *   return (
 *     <ul>
 *       {webhooks.map((wrapper) => {
 *         const meta = discovery.getMetadataByDecorator(Webhook, wrapper);
 *         return <li key={wrapper.id}>{meta?.name}</li>;
 *       })}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDiscovered<T>(
  decorator: DiscoverableDecorator<T>,
  options?: UseDiscoveredOptions,
): InstanceWrapper[] {
  const discovery = useDiscovery();
  const include = options?.include;

  return useMemo(() => {
    const wrappers = discovery.getProviders({ metadataKey: decorator.KEY });
    if (!include || include.length === 0) {
      return wrappers;
    }
    // Post-filter by host module — the metadata-key index is global, so this
    // is the cheapest way to keep both filters available without widening
    // the service contract.
    const allowed = new Set(include);
    return wrappers.filter((wrapper) => {
      const hostMetatype = wrapper.host?.metatype;
      return !!hostMetatype && allowed.has(hostMetatype);
    });
  }, [discovery, decorator, include]);
}
