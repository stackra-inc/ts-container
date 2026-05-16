/**
 * useDiscovery Hook
 *
 * Resolve `DiscoveryService` from the active container. Convenience hook
 * for components that want to drive plugin-style features (webhooks,
 * event handlers, telemetry probes, etc.) off discoverable decorators.
 *
 * @module hooks/use-discovery
 */

import { useInject } from "@/hooks/use-inject";
import { DiscoveryService } from "@/services/discovery.service";

/**
 * Get the active `DiscoveryService` instance.
 *
 * Equivalent to `useInject(DiscoveryService)`. The returned reference is
 * stable for the lifetime of the container, so it's safe to use as a
 * dependency in `useEffect` / `useMemo`.
 *
 * @returns The `DiscoveryService` resolved from the container
 *
 * @throws Error if `DiscoveryModule` was not imported, or if the hook is
 *   used outside `<ContainerProvider>`
 *
 * @example
 * ```tsx
 * function WebhookList() {
 *   const discovery = useDiscovery();
 *   const wrappers = discovery.getProviders({ metadataKey: Webhook.KEY });
 *   return <ul>{wrappers.map(w => <li key={w.id}>{w.name}</li>)}</ul>;
 * }
 * ```
 */
export function useDiscovery(): DiscoveryService {
  return useInject(DiscoveryService);
}
