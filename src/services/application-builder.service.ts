/**
 * ApplicationBuilder — Fluent Bootstrap API
 *
 * Provides a chainable builder pattern for bootstrapping the DI container.
 * Wraps `ApplicationFactory.create()` with lifecycle hooks and options
 * configuration before calling `boot()`.
 *
 * Mirrors the builder pattern common in NestJS ecosystem packages
 * (e.g., `ConfigModule.forRoot()`) but applied to the application itself.
 *
 * ## Usage
 *
 * ```typescript
 * import { ApplicationFactory } from '@stackra/ts-container';
 *
 * const app = await ApplicationFactory.builder(AppModule)
 *   .withOptions({ debug: true, shutdownHooks: true })
 *   .onBeforeBoot(() => {
 *     // env setup, PWA capture, etc.
 *   })
 *   .onBoot((ctx) => {
 *     // post-bootstrap logic
 *   })
 *   .boot();
 * ```
 *
 * @module application/application-builder
 */

import { ApplicationFactory } from "@/factories/application.factory";
import type { ApplicationContext } from "@/services/application-context.service";
import type { Type } from "@/types/type.type";
import type { ModuleInput } from "@/types/module-input.type";
import type { ApplicationContextOptions } from "@/interfaces/application-context-options.interface";

/**
 * Fluent builder for bootstrapping an `ApplicationContext` instance.
 *
 * Encapsulates the full bootstrap sequence: before-boot hooks,
 * context creation, boot hooks, and shutdown registration.
 *
 * Accepts either a direct module class or a factory function returning
 * a promise of the class (for dynamic import / deferred loading).
 *
 * @example
 * ```typescript
 * const app = await ApplicationFactory.builder(AppModule)
 *   .withOptions({ debug: true })
 *   .onBeforeBoot(() => {
 *     window.addEventListener('beforeinstallprompt', (e) => {
 *       e.preventDefault();
 *       (window as any).__PWA_DEFERRED_PROMPT__ = e;
 *     });
 *   })
 *   .onBoot((ctx) => {
 *     if ((window as any).electronAPI) {
 *       document.body.classList.add('is-electron');
 *     }
 *   })
 *   .boot();
 * ```
 */
export class ApplicationBuilder {
  /**
   * The root module class or factory function to bootstrap.
   *
   * When a factory is provided, it is resolved during `boot()` after
   * the before-boot hooks have executed — allowing env setup to complete
   * before the module is evaluated.
   */
  private readonly rootModule: ModuleInput;

  /**
   * Options passed to `ApplicationFactory.create()`.
   */
  private options: ApplicationContextOptions = {};

  /**
   * Hooks executed before the DI container is created.
   * Run in registration order.
   */
  private beforeBootHooks: Array<() => void | Promise<void>> = [];

  /**
   * Hooks executed after the DI container is created.
   * Run in registration order. Receive the bootstrapped context.
   */
  private bootHooks: Array<(ctx: ApplicationContext) => void | Promise<void>> = [];

  /**
   * Create a new ApplicationBuilder for the given root module.
   *
   * @param rootModule - The root module class, or a factory function that
   *   returns a promise resolving to the class (for dynamic imports)
   *
   * @example
   * ```typescript
   * // Direct class
   * new ApplicationBuilder(AppModule);
   *
   * // Factory for dynamic import
   * new ApplicationBuilder(() => import('@/lib/app.module').then(m => m.AppModule));
   * ```
   */
  public constructor(rootModule: ModuleInput) {
    this.rootModule = rootModule;
  }

  // ── Configuration ──────────────────────────────────────────────────────

  /**
   * Set `ApplicationContextOptions` passed to `ApplicationFactory.create()`.
   *
   * Merges with any previously set options (last call wins for
   * overlapping keys).
   *
   * @param options - Configuration for the application context
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * ApplicationFactory.builder(AppModule)
   *   .withOptions({ debug: true, globalName: '__POS__' })
   *   .boot();
   * ```
   */
  public withOptions(options: ApplicationContextOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  // ── Lifecycle Hooks ────────────────────────────────────────────────────

  /**
   * Register a hook to run before the DI container is created.
   *
   * Use for environment setup, PWA prompt capture, or any logic
   * that must execute before module scanning begins.
   *
   * Hooks are executed in registration order.
   *
   * @param hook - Callback to execute before bootstrap (can be async)
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * ApplicationFactory.builder(AppModule)
   *   .onBeforeBoot(() => {
   *     window.addEventListener('beforeinstallprompt', (e) => {
   *       e.preventDefault();
   *       (window as any).__PWA_DEFERRED_PROMPT__ = e;
   *     });
   *   })
   *   .boot();
   * ```
   */
  public onBeforeBoot(hook: () => void | Promise<void>): this {
    this.beforeBootHooks.push(hook);
    return this;
  }

  /**
   * Register a hook to run after the DI container is created.
   *
   * Use for post-bootstrap logic like applying platform CSS classes,
   * initializing analytics, or registering additional event listeners.
   *
   * Hooks are executed in registration order.
   *
   * @param hook - Callback receiving the bootstrapped `ApplicationContext` (can be async)
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * ApplicationFactory.builder(AppModule)
   *   .onBoot((ctx) => {
   *     if ((window as any).electronAPI) {
   *       document.body.classList.add('is-electron');
   *     }
   *   })
   *   .boot();
   * ```
   */
  public onBoot(hook: (ctx: ApplicationContext) => void | Promise<void>): this {
    this.bootHooks.push(hook);
    return this;
  }

  // ── Build ──────────────────────────────────────────────────────────────

  /**
   * Execute the bootstrap sequence and return the `ApplicationContext`.
   *
   * The sequence is:
   * 1. Run all `beforeBootHooks` in registration order
   * 2. Resolve the root module (if a factory was provided, await it)
   * 3. Call `ApplicationFactory.create(rootModule, options)`
   * 4. Run all `bootHooks` in registration order
   * 5. Return the bootstrapped `ApplicationContext`
   *
   * @returns The fully bootstrapped `ApplicationContext` instance
   *
   * @throws Error if `ApplicationFactory.create()` fails (e.g., missing providers)
   * @throws Error if the module factory rejects (e.g., import failure)
   *
   * @example
   * ```typescript
   * const app = await ApplicationFactory.builder(AppModule)
   *   .withOptions({ debug: true })
   *   .onBeforeBoot(() => logger.info('Before boot'))
   *   .onBoot((ctx) => logger.info('Booted!'))
   *   .boot();
   * ```
   */
  public async boot(): Promise<ApplicationContext> {
    // Phase 1: Before-boot hooks
    for (const hook of this.beforeBootHooks) {
      await hook();
    }

    // Phase 2: Resolve the root module (supports factory functions for dynamic imports)
    const resolvedModule =
      typeof this.rootModule === "function" && !this.rootModule.prototype
        ? await (this.rootModule as () => Promise<Type<any>>)()
        : (this.rootModule as Type<any>);

    // Phase 3: Create the DI container
    const context = await ApplicationFactory.create(resolvedModule, this.options);

    // Phase 4: Boot hooks
    for (const hook of this.bootHooks) {
      await hook(context);
    }

    return context;
  }
}
