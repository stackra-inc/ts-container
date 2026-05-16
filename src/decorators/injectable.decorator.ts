/**
 * @Injectable() Decorator
 *
 * Marks a class as a provider that can be managed by the DI container.
 * This is the most fundamental decorator in the system — any class that
 * needs to be injected or have dependencies injected into it must be
 * decorated with `@Injectable()`.
 *
 * ## What it does:
 *
 * 1. Sets the `__injectable__` watermark on the class (so the scanner can identify it)
 * 2. Stores scope options (singleton vs transient) as metadata
 * 3. TypeScript's `emitDecoratorMetadata` automatically emits `design:paramtypes`
 *    (constructor parameter types) because a decorator is present on the class
 *
 * That third point is crucial — without `@Injectable()`, TypeScript won't emit
 * the constructor parameter type metadata that the injector needs to auto-resolve
 * dependencies.
 *
 * All metadata writes go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module decorators/injectable
 */

import { defineMetadata } from "@vivtel/metadata";

import type { ScopeOptions } from "@/interfaces/scope-options.interface";
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from "@/constants";

/**
 * Marks a class as injectable (a DI-managed provider).
 *
 * Sets the `__injectable__` watermark and stores scope options as metadata
 * on the target class. The presence of this decorator also triggers
 * TypeScript's `emitDecoratorMetadata` to emit `design:paramtypes`,
 * which the injector uses for automatic constructor dependency resolution.
 *
 * @param options - Optional scope configuration. When omitted, the provider
 *   defaults to singleton scope (`Scope.DEFAULT`).
 * @returns A `ClassDecorator` that sets injectable metadata on the target
 *
 * @example
 * ```typescript
 * // Basic usage — singleton by default
 * @Injectable()
 * class UserService {
 *   constructor(private config: ConfigService) {}
 * }
 *
 * // Transient scope — new instance per injection
 * @Injectable({ scope: Scope.TRANSIENT })
 * class RequestLogger {
 *   private readonly id = Math.random();
 * }
 * ```
 */
export function Injectable(options?: ScopeOptions): ClassDecorator {
  return (target: object) => {
    defineMetadata(INJECTABLE_WATERMARK, true, target);
    defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
  };
}
