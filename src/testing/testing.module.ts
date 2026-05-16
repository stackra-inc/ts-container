/**
 * TestingModule — Provider Override API for Testing Scenarios
 *
 * Provides a builder pattern for creating test-specific application contexts
 * with overridden providers. Mirrors NestJS's `Test.createTestingModule()`.
 *
 * ## Usage
 *
 * ```typescript
 * const app = await TestingModule.create(AppModule)
 *   .overrideProvider(DatabaseService)
 *   .useValue(mockDatabase)
 *   .compile();
 *
 * const service = app.get(UserService);
 * // UserService now uses mockDatabase instead of real DatabaseService
 * ```
 *
 * @module testing/testing-module
 */

import { ModuleContainer } from "@/registries/container.registry";
import { DependenciesScanner } from "@/services/scanner.service";
import { InstanceLoader } from "@/services/instance-loader.service";
import { ApplicationContext } from "@/services/application-context.service";
import { setGlobalApplicationContext } from "@/utils/global-application.util";
import type { Type } from "@/types/type.type";
import type { InjectionToken } from "@/interfaces/injection-token.interface";
import type { Provider } from "@/interfaces/provider.interface";

/**
 * Override definition for a single provider.
 */
interface ProviderOverride {
  token: InjectionToken;
  provider: Provider;
}

/**
 * Fluent builder for specifying how to override a provider.
 */
class OverrideBuilder {
  /**
   * @param testingModule - The parent TestingModuleBuilder
   * @param token - The token being overridden
   */
  constructor(
    private readonly testingModule: TestingModuleBuilder,
    private readonly token: InjectionToken,
  ) {}

  /**
   * Override with a value.
   *
   * @param value - The value to use instead of the real provider
   * @returns The parent TestingModuleBuilder for chaining
   */
  public useValue(value: any): TestingModuleBuilder {
    this.testingModule.addOverride({
      token: this.token,
      provider: { provide: this.token, useValue: value },
    });
    return this.testingModule;
  }

  /**
   * Override with a different class.
   *
   * @param cls - The class to use instead
   * @returns The parent TestingModuleBuilder for chaining
   */
  public useClass(cls: Type<any>): TestingModuleBuilder {
    this.testingModule.addOverride({
      token: this.token,
      provider: { provide: this.token, useClass: cls },
    });
    return this.testingModule;
  }

  /**
   * Override with a factory function.
   *
   * @param factory - The factory function
   * @param inject - Optional dependencies to inject into the factory
   * @returns The parent TestingModuleBuilder for chaining
   */
  public useFactory(
    factory: (...args: any[]) => any,
    inject?: InjectionToken[],
  ): TestingModuleBuilder {
    this.testingModule.addOverride({
      token: this.token,
      provider: { provide: this.token, useFactory: factory, inject: inject ?? [] },
    });
    return this.testingModule;
  }
}

/**
 * Builder for creating test application contexts with provider overrides.
 *
 * @example
 * ```typescript
 * const app = await TestingModule.create(AppModule)
 *   .overrideProvider(DatabaseService)
 *   .useValue({ query: vi.fn() })
 *   .overrideProvider(CACHE_CONFIG)
 *   .useValue({ ttl: 0 })
 *   .compile();
 * ```
 */
class TestingModuleBuilder {
  /**
   * Accumulated provider overrides.
   */
  private readonly overrides: ProviderOverride[] = [];

  /**
   * @param rootModule - The root module to bootstrap
   */
  constructor(private readonly rootModule: Type<any>) {}

  /**
   * Start overriding a provider by its token.
   *
   * @param token - The injection token to override
   * @returns An OverrideBuilder for specifying the replacement
   */
  public overrideProvider(token: InjectionToken): OverrideBuilder {
    return new OverrideBuilder(this, token);
  }

  /**
   * Add an override to the internal list.
   *
   * @param override - The override definition
   * @internal
   */
  public addOverride(override: ProviderOverride): void {
    this.overrides.push(override);
  }

  /**
   * Compile and bootstrap the testing module.
   *
   * Scans the module tree, applies all provider overrides, then
   * resolves instances and runs lifecycle hooks.
   *
   * @returns A fully bootstrapped ApplicationContext with overrides applied
   */
  public async compile(): Promise<ApplicationContext> {
    // Phase 1: Scan
    const container = new ModuleContainer();
    const scanner = new DependenciesScanner(container);
    await scanner.scan(this.rootModule);

    // Phase 2: Register ModuleContainer on every module
    for (const moduleRef of container.getModules().values()) {
      if (!moduleRef.providers.has(ModuleContainer)) {
        container.addProvider({ provide: ModuleContainer, useValue: container }, moduleRef.token);
      }
    }

    // Phase 3: Apply overrides — replace providers in all modules
    for (const override of this.overrides) {
      for (const [, moduleRef] of container.getModules()) {
        if (moduleRef.providers.has(override.token)) {
          // Remove existing and re-add with override
          moduleRef.providers.delete(override.token);
          moduleRef.addProvider(override.provider);
        }
      }
    }

    // Phase 4: Instantiate
    const instanceLoader = new InstanceLoader(container);
    const context = new ApplicationContext(container, instanceLoader);
    await context.init();

    // Phase 5: Register as global
    setGlobalApplicationContext(context);

    return context;
  }
}

/**
 * Entry point for creating test application contexts.
 *
 * @example
 * ```typescript
 * const app = await TestingModule.create(AppModule)
 *   .overrideProvider(HttpService)
 *   .useValue(mockHttp)
 *   .compile();
 * ```
 */
export class TestingModule {
  /**
   * Create a new testing module builder.
   *
   * @param rootModule - The root module class to bootstrap
   * @returns A TestingModuleBuilder for configuring overrides
   */
  public static create(rootModule: Type<any>): TestingModuleBuilder {
    return new TestingModuleBuilder(rootModule);
  }
}
