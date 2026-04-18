/**
 * OnModuleInit Lifecycle Interface
 *
 * Providers can implement this interface to hook into the application
 * bootstrap lifecycle. Called after all providers in the module have
 * been instantiated and their dependencies injected.
 *
 * @module interfaces/on-module-init
 */

/**
 * Interface for providers that need initialization after construction.
 *
 * `onModuleInit()` is called after all providers in the module have been
 * instantiated and their dependencies injected. This is the right place
 * for async initialization like connecting to databases or warming caches.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class DatabaseService implements OnModuleInit {
 *   private connection: Connection;
 *
 *   constructor(@Inject(DB_CONFIG) private config: DbConfig) {}
 *
 *   async onModuleInit() {
 *     // All dependencies are available here
 *     this.connection = await createConnection(this.config);
 *   }
 * }
 * ```
 */
export interface OnModuleInit {
  /**
   * Called after all providers in the module are instantiated.
   *
   * Can be synchronous or asynchronous. If async, the container
   * awaits completion before proceeding to the next provider.
   *
   * @returns Void or a Promise that resolves when initialization is complete
   */
  onModuleInit(): any | Promise<any>;
}

/**
 * Type guard that checks if an object implements the `OnModuleInit` interface.
 *
 * Used by the `InstanceLoader` to determine which providers need their
 * `onModuleInit()` hook called after instantiation.
 *
 * @param instance - The object to check, typically a resolved provider instance
 * @returns `true` if the instance has an `onModuleInit` method
 *
 * @example
 * ```typescript
 * if (hasOnModuleInit(wrapper.instance)) {
 *   await wrapper.instance.onModuleInit();
 * }
 * ```
 */
export function hasOnModuleInit(instance: any): instance is OnModuleInit {
  return instance && typeof instance.onModuleInit === 'function';
}
