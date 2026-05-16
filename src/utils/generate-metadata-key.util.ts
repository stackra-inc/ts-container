/**
 * generateMetadataKey Utility
 *
 * Internal helper used by `DiscoveryService.createDecorator()` to mint a
 * unique, human-recognizable metadata key for each discoverable decorator
 * the user creates. The key is stable for the lifetime of the process and
 * unique across discoverable decorators — the prefix makes it easy to
 * tell apart from the framework's own DI metadata in devtools.
 *
 * @module utils/generate-metadata-key
 */

import { DISCOVERABLE_DECORATOR_KEY_PREFIX } from "@/constants";

/**
 * Subset of the global `crypto` shape we rely on.
 *
 * Declared inline so the helper stays usable in any environment that
 * exposes `crypto.randomUUID()` (modern browsers, Node 19+, Bun, Deno).
 * Older runtimes fall back to a `Date.now() + Math.random()` string.
 *
 * @internal
 */
type CryptoLike = { randomUUID?: () => string };

/**
 * Generate a globally-unique metadata key for a discoverable decorator.
 *
 * The format is `${DISCOVERABLE_DECORATOR_KEY_PREFIX}${uuid}`, which makes
 * the source of the key obvious in stack traces, devtools, and serialized
 * graph snapshots.
 *
 * Uses native `Number#toString(36)` and `String#substring()` here — both
 * are explicit exceptions in the codebase's string-handling rules
 * (radix conversion has no `Str` equivalent; `substring` is listed as an
 * approved native method for mid-string extraction).
 *
 * @returns A new prefixed metadata key string.
 *
 * @example
 * ```typescript
 * generateMetadataKey();
 * // → "@discoverable:7f1c8b40-9f2e-4a4d-b1d0-1d2c1c5e9c7e"
 * ```
 */
export function generateMetadataKey(): string {
  const cryptoRef = (globalThis as { crypto?: CryptoLike }).crypto;
  const uuid =
    cryptoRef?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 12)}`;
  return `${DISCOVERABLE_DECORATOR_KEY_PREFIX}${uuid}`;
}
