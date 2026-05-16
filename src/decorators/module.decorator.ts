/**
 * @Module() Decorator
 *
 * Defines a module — the organizational unit of the DI system.
 * Modules group related providers and define the dependency graph
 * between different parts of the application.
 *
 * ## How it works:
 *
 * The decorator iterates over the metadata object and stores each
 * property under the corresponding `MODULE_METADATA` constant key:
 *
 * ```
 * @Module({ imports: [...], providers: [...], exports: [...] })
 * class MyModule {}
 *
 * // Becomes:
 * defineMetadata(MODULE_METADATA.IMPORTS, [...], MyModule)
 * defineMetadata(MODULE_METADATA.PROVIDERS, [...], MyModule)
 * defineMetadata(MODULE_METADATA.EXPORTS, [...], MyModule)
 * ```
 *
 * The scanner later reads these metadata entries to build the module graph.
 * Both writers (this decorator) and readers (the scanner) reference the
 * `MODULE_METADATA` constant — never raw strings — to guarantee they stay
 * in lockstep.
 *
 * All metadata writes go through `@vivtel/metadata` for a consistent,
 * typed API instead of raw `Reflect.*` calls.
 *
 * @module decorators/module
 */

import { defineMetadata } from "@vivtel/metadata";

import { MODULE_METADATA } from "@/constants";
import type { ModuleMetadata } from "@/interfaces/module-metadata.interface";

/**
 * Map from accepted property names on `ModuleMetadata` to the canonical
 * metadata key constants from `MODULE_METADATA`.
 *
 * Used both for input-key validation and to translate decorator
 * arguments into the constants the scanner reads. Order matches the
 * fields declared on {@link ModuleMetadata}.
 */
const PROPERTY_TO_METADATA_KEY: Record<keyof ModuleMetadata, string> = {
  imports: MODULE_METADATA.IMPORTS,
  providers: MODULE_METADATA.PROVIDERS,
  exports: MODULE_METADATA.EXPORTS,
  entryProviders: MODULE_METADATA.ENTRY_PROVIDERS,
};

/**
 * Set of valid property keys on the metadata object passed to `@Module()`.
 * Computed once at module-load time from {@link PROPERTY_TO_METADATA_KEY}.
 */
const VALID_MODULE_KEYS = new Set(Object.keys(PROPERTY_TO_METADATA_KEY));

/**
 * Defines a module with its imports, providers, and exports.
 *
 * Validates that only known metadata keys are used, then stores each
 * property under its canonical {@link MODULE_METADATA} constant on the
 * target class. The scanner reads these entries during the module graph
 * traversal.
 *
 * @param metadata - Module configuration specifying imports, providers, and exports.
 *   Only the keys `imports`, `providers`, `exports`, and `entryProviders` are allowed.
 * @returns A `ClassDecorator` that stores the module metadata on the target class
 *
 * @throws Error if any unknown property keys are passed in the metadata object
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [ConfigModule.forRoot(config)],
 *   providers: [UserService, UserRepository],
 *   exports: [UserService],
 * })
 * class UserModule {}
 * ```
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  // Validate that only known keys are used.
  const invalidKeys = Object.keys(metadata).filter((key) => !VALID_MODULE_KEYS.has(key));
  if (invalidKeys.length > 0) {
    throw new Error(
      `Invalid property '${invalidKeys.join("', '")}' passed into the @Module() decorator. ` +
        `Valid properties are: ${[...VALID_MODULE_KEYS].join(", ")}.`,
    );
  }

  return (target: object) => {
    for (const property in metadata) {
      if (!Object.prototype.hasOwnProperty.call(metadata, property)) continue;

      // Translate the input property name into the canonical metadata key
      // constant. We've already validated the property is a known key.
      const metadataKey = PROPERTY_TO_METADATA_KEY[property as keyof ModuleMetadata];
      defineMetadata(metadataKey, (metadata as Record<string, unknown>)[property], target);
    }
  };
}
