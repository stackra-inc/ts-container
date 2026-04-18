/**
 * Constants Barrel Export
 *
 * Metadata keys and tokens used throughout the DI system. These constants
 * define the contract between decorators (which write metadata) and the
 * injector/scanner (which read metadata).
 *
 * - {@link MODULE_METADATA} — Keys for `@Module()` decorator metadata (imports, providers, exports)
 * - {@link GLOBAL_MODULE_METADATA} — Key for `@Global()` decorator
 * - {@link INJECTABLE_WATERMARK} — Watermark set by `@Injectable()`
 * - {@link SCOPE_OPTIONS_METADATA} — Scope configuration from `@Injectable()`
 * - {@link PARAMTYPES_METADATA} — TypeScript-emitted constructor parameter types
 * - {@link SELF_DECLARED_DEPS_METADATA} — Explicit `@Inject()` overrides for constructor params
 * - {@link OPTIONAL_DEPS_METADATA} — Optional constructor parameter indices
 * - {@link PROPERTY_DEPS_METADATA} — Property injection targets
 * - {@link OPTIONAL_PROPERTY_DEPS_METADATA} — Optional property injection keys
 *
 * @module constants
 */

export {
  MODULE_METADATA,
  GLOBAL_MODULE_METADATA,
  INJECTABLE_WATERMARK,
  SCOPE_OPTIONS_METADATA,
  PARAMTYPES_METADATA,
  SELF_DECLARED_DEPS_METADATA,
  OPTIONAL_DEPS_METADATA,
  PROPERTY_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
} from './tokens.constant';
