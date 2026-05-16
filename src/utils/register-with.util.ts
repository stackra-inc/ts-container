/**
 * registerWith — Clean factory provider for registry registration.
 *
 * Encapsulates the "inject a DI-managed registry, run a callback"
 * pattern into a single function call. Eliminates the boilerplate of
 * unique `provide` tokens, `useValue` intermediaries, and manual
 * `inject` arrays that every `forFeature()` currently repeats.
 *
 * ## Before (verbose)
 *
 * ```typescript
 * static forFeature(themes: ThemeConfig[]): DynamicModule {
 *   return {
 *     module: ThemeModule,
 *     providers: [
 *       { provide: THEME_FEATURE_CONFIGS, useValue: themes },
 *       {
 *         provide: `THEME_FEATURE_INIT_${Date.now()}`,
 *         useFactory: (r: ThemeRegistry, configs: ThemeConfig[]) => {
 *           for (const theme of configs) r.register(theme.id, theme);
 *           return true;
 *         },
 *         inject: [ThemeRegistry, THEME_FEATURE_CONFIGS],
 *       },
 *     ],
 *   };
 * }
 * ```
 *
 * ## After (clean)
 *
 * ```typescript
 * static forFeature(themes: ThemeConfig[]): DynamicModule {
 *   return {
 *     module: ThemeModule,
 *     providers: [
 *       registerWith(ThemeRegistry, (registry) => {
 *         for (const theme of themes) registry.register(theme.id, theme);
 *       }),
 *     ],
 *   };
 * }
 * ```
 *
 * ## Multi-registry variant
 *
 * ```typescript
 * registerWith([SlotRegistry, ThemeRegistry], (slots, themes) => {
 *   slots.registerEntry("auth:header:end", { ... });
 *   themes.register("custom", { ... });
 * });
 * ```
 *
 * @module @stackra/ts-container
 * @category Utils
 */

import type { InjectionToken } from "@/interfaces/injection-token.interface";
import type { FactoryProvider } from "@/interfaces/factory-provider.interface";

/**
 * Auto-incrementing counter for unique provider tokens.
 *
 * @internal
 */
let registrationCounter = 0;

/**
 * Create a factory provider that injects a single registry and runs a
 * callback with it. The callback's closure captures the data to
 * register — no intermediate `useValue` provider needed.
 *
 * @typeParam T - The registry type.
 * @param token - The DI token (class or Symbol) for the registry.
 * @param callback - Function invoked with the resolved registry instance.
 * @returns A `FactoryProvider` ready to be placed in a module's `providers` array.
 *
 * @example
 * ```typescript
 * import { registerWith } from "@stackra/ts-container";
 *
 * ThemeModule.forFeature(themes) {
 *   return {
 *     module: ThemeModule,
 *     providers: [
 *       registerWith(ThemeRegistry, (registry) => {
 *         for (const t of themes) registry.register(t.id, t);
 *       }),
 *     ],
 *   };
 * }
 * ```
 */
export function registerWith<T>(
  token: InjectionToken,
  callback: (instance: T) => void,
): FactoryProvider;

/**
 * Create a factory provider that injects multiple registries and runs
 * a callback with all of them. Useful when a single `forFeature()`
 * call needs to register items across several registries.
 *
 * @param tokens - Array of DI tokens to inject.
 * @param callback - Function invoked with the resolved instances (same order as tokens).
 * @returns A `FactoryProvider` ready to be placed in a module's `providers` array.
 *
 * @example
 * ```typescript
 * registerWith(
 *   [SlotRegistry, ThemeRegistry],
 *   (slots, themes) => {
 *     slots.registerEntry("auth:header:end", { ... });
 *     themes.register("custom", { ... });
 *   },
 * );
 * ```
 */
export function registerWith<T extends unknown[]>(
  tokens: InjectionToken[],
  callback: (...instances: T) => void,
): FactoryProvider;

/**
 * Implementation.
 */
export function registerWith(
  tokenOrTokens: InjectionToken | InjectionToken[],
  callback: (...args: any[]) => void,
): FactoryProvider {
  const tokens = Array.isArray(tokenOrTokens) ? tokenOrTokens : [tokenOrTokens];
  const id = ++registrationCounter;

  return {
    provide: `__REGISTER_WITH_${id}__`,
    useFactory: (...instances: unknown[]) => {
      callback(...instances);
      return true;
    },
    inject: tokens,
  };
}
