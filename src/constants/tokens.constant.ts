/**
 * Metadata Keys & Constants
 *
 * These constants define the metadata keys that decorators write to classes
 * and that the injector reads during resolution. They mirror NestJS's
 * internal constants but are simplified for client-side use.
 *
 * ## How metadata flows:
 *
 * ```
 * Decorators (@Injectable, @Inject, @Module, etc.)
 *   └── Reflect.defineMetadata(KEY, value, target)
 *         ├── Scanner reads module metadata (imports, providers, exports)
 *         └── Injector reads constructor metadata (design:paramtypes, self:paramtypes)
 * ```
 *
 * 1. **Decorators** write metadata using `Reflect.defineMetadata(KEY, value, target)`
 * 2. **Scanner** reads module metadata (`imports`, `providers`, `exports`) to build the module graph
 * 3. **Injector** reads constructor metadata (`design:paramtypes`, `self:paramtypes`) to resolve dependencies
 *
 * @module constants/tokens
 */

// ─────────────────────────────────────────────────────────────────────────────
// Module metadata keys
// Written by @Module() decorator, read by DependenciesScanner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keys used by the `@Module()` decorator to store module configuration.
 *
 * The `@Module()` decorator iterates over the metadata object and calls
 * `Reflect.defineMetadata(key, value, target)` for each property.
 * The scanner reads these keys back to build the module graph.
 *
 * @example
 * ```typescript
 * // When you write:
 * @Module({ imports: [ConfigModule], providers: [UserService], exports: [UserService] })
 * class AppModule {}
 *
 * // The decorator stores:
 * Reflect.defineMetadata('imports', [ConfigModule], AppModule)
 * Reflect.defineMetadata('providers', [UserService], AppModule)
 * Reflect.defineMetadata('exports', [UserService], AppModule)
 * ```
 */
export const MODULE_METADATA = {
  IMPORTS: 'imports',
  PROVIDERS: 'providers',
  EXPORTS: 'exports',
  ENTRY_PROVIDERS: 'entryProviders',
} as const;

/**
 * Metadata key set by the `@Global()` decorator.
 *
 * When present and `true`, the module's exported providers are available
 * to all other modules without explicit imports. The scanner checks this
 * key during module registration to populate the global modules set.
 *
 * @example
 * ```typescript
 * @Global()
 * @Module({ providers: [ConfigService], exports: [ConfigService] })
 * class ConfigModule {}
 *
 * // Internally:
 * Reflect.defineMetadata('__module:global__', true, ConfigModule)
 * ```
 */
export const GLOBAL_MODULE_METADATA = '__module:global__';

// ─────────────────────────────────────────────────────────────────────────────
// Injectable metadata keys
// Written by @Injectable() decorator, read by Injector
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Watermark set by `@Injectable()` to mark a class as a provider.
 *
 * The scanner uses this to validate that providers are properly decorated.
 * Any class registered as a provider without this watermark may trigger
 * a warning or error during scanning.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {}
 *
 * // Check if a class is injectable:
 * const isInjectable = Reflect.getMetadata('__injectable__', UserService); // true
 * ```
 */
export const INJECTABLE_WATERMARK = '__injectable__';

/**
 * Scope options metadata set by `@Injectable({ scope: Scope.REQUEST })`.
 *
 * Stores the `ScopeOptions` object passed to the `@Injectable()` decorator.
 * For client-side use, we primarily support `DEFAULT` (singleton) and
 * `TRANSIENT` scopes.
 *
 * @example
 * ```typescript
 * @Injectable({ scope: Scope.TRANSIENT })
 * class RequestLogger {}
 *
 * // Read scope:
 * const options = Reflect.getMetadata('scope:options', RequestLogger);
 * // { scope: Scope.TRANSIENT }
 * ```
 */
export const SCOPE_OPTIONS_METADATA = 'scope:options';

// ─────────────────────────────────────────────────────────────────────────────
// Constructor injection metadata keys
// Written by @Inject() and TypeScript's emitDecoratorMetadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TypeScript's built-in metadata key for constructor parameter types.
 *
 * Automatically emitted when `emitDecoratorMetadata: true` in tsconfig.
 * Contains an array of constructor parameter types (class references).
 * This is the primary source for auto-resolving dependencies.
 *
 * The injector reads this first, then overlays any explicit `@Inject()`
 * overrides from `self:paramtypes`.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {
 *   constructor(private config: ConfigService, private logger: LoggerService) {}
 * }
 * // TypeScript emits: Reflect.defineMetadata('design:paramtypes', [ConfigService, LoggerService], UserService)
 * ```
 */
export const PARAMTYPES_METADATA = 'design:paramtypes';

/**
 * Metadata key for explicitly declared constructor dependencies.
 *
 * Written by the `@Inject(token)` decorator for constructor parameters.
 * Contains an array of `{ index: number, param: InjectionToken }` objects.
 * These override the auto-detected types from `design:paramtypes` at the
 * corresponding parameter index.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class CacheService {
 *   constructor(@Inject(CACHE_CONFIG) private config: CacheConfig) {}
 * }
 * // @Inject writes: [{ index: 0, param: CACHE_CONFIG }] to 'self:paramtypes'
 * ```
 */
export const SELF_DECLARED_DEPS_METADATA = 'self:paramtypes';

/**
 * Metadata key for optional constructor dependencies.
 *
 * Written by the `@Optional()` decorator for constructor parameters.
 * Contains an array of parameter indices that are optional.
 * If resolution fails for an optional dependency, `undefined` is injected
 * instead of throwing an error.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class CacheService {
 *   constructor(@Optional() @Inject(RedisManager) private redis?: RedisManager) {}
 * }
 * // @Optional writes: [0] to 'optional:paramtypes'
 * ```
 */
export const OPTIONAL_DEPS_METADATA = 'optional:paramtypes';

// ─────────────────────────────────────────────────────────────────────────────
// Property injection metadata keys
// Written by @Inject() on class properties
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata key for property-based injection targets.
 *
 * Written by `@Inject(token)` when used on a class property.
 * Contains an array of `{ key: string, type: InjectionToken }` objects.
 * After construction, the injector iterates these entries and assigns
 * the resolved value to each property.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {
 *   @Inject(LoggerService)
 *   private logger!: LoggerService;
 * }
 * // @Inject writes: [{ key: 'logger', type: LoggerService }] to 'self:properties_metadata'
 * ```
 */
export const PROPERTY_DEPS_METADATA = 'self:properties_metadata';

/**
 * Metadata key for optional property dependencies.
 *
 * Written by `@Optional()` when used on a class property.
 * Contains an array of property keys that are optional.
 * If resolution fails for an optional property, it is left as `undefined`.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {
 *   @Optional() @Inject(AnalyticsService)
 *   private analytics?: AnalyticsService;
 * }
 * // @Optional writes: ['analytics'] to 'optional:properties_metadata'
 * ```
 */
export const OPTIONAL_PROPERTY_DEPS_METADATA = 'optional:properties_metadata';
