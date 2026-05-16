/**
 * Dynamic Module Interface
 *
 * Represents a module that is configured at runtime via static methods
 * like `forRoot()` or `forFeature()`.
 *
 * @module @stackra/ts-container/interfaces
 */

import type { ModuleMetadata } from "./module-metadata.interface";

/**
 * A dynamically configured module returned by `forRoot()` / `forFeature()`.
 *
 * Extends the static module metadata with a reference to the module class
 * and an optional `global` flag.
 */
export interface DynamicModule extends ModuleMetadata {
  /** The module class this configuration belongs to. */
  module: any;

  /** Whether this module should be registered globally. */
  global?: boolean;
}

/** Alias for backward compatibility. */
export type IDynamicModule = DynamicModule;
