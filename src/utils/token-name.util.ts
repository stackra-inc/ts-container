/**
 * tokenName Utility
 *
 * Converts an arbitrary injection token into a human-readable string for
 * error messages, log lines, and devtools. Mirrors the
 * `getTokenName()` helpers used internally by `Injector`, `Module`, and
 * `ApplicationContext`, but exported as a standalone utility so it can be reused
 * by extensions (e.g., `DiscoveryService`).
 *
 * @module utils/token-name
 */

/**
 * Get a human-readable string for any injection token.
 *
 * - Functions (classes) → `function.name`
 * - Symbols → `Symbol#toString()` (`"Symbol(MY_TOKEN)"`)
 * - Everything else → `String(token)` (type coercion)
 *
 * @param token - The token to describe.
 * @returns A readable name suitable for logs and error messages.
 *
 * @example
 * ```typescript
 * tokenName(UserService); // → "UserService"
 * tokenName(Symbol.for("MY_TOKEN")); // → "Symbol(MY_TOKEN)"
 * tokenName("API_URL"); // → "API_URL"
 * ```
 */
export function tokenName(token: unknown): string {
  if (typeof token === "function") return token.name;
  if (typeof token === "symbol") return token.toString();
  return String(token);
}
