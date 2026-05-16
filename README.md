<div align="center">
  <img src=".github/assets/banner.svg" alt="@stackra/ts-container" width="100%" />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@stackra/ts-container?style=flat-square&color=3178c6)](https://www.npmjs.com/package/@stackra/ts-container)
[![npm downloads](https://img.shields.io/npm/dm/@stackra/ts-container?style=flat-square&color=3178c6)](https://www.npmjs.com/package/@stackra/ts-container)
[![CI](https://img.shields.io/github/actions/workflow/status/stackra-inc/ts-container/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/stackra-inc/ts-container/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.x-f69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)

NestJS-style IoC container and dependency injection for TypeScript and React.  
Built from scratch — no Inversify, no heavy runtime.

[Installation](#installation) · [Quick Start](#quick-start) ·
[Core Concepts](#core-concepts) · [React Integration](#react-integration) ·
[API Reference](#api-reference)

</div>

---

## Features

- 💉 **`@Injectable()`** — mark classes as DI-managed providers
- 🎯 **`@Inject(token)`** — explicit token injection (string, symbol, or class)
- ❓ **`@Optional()`** — optional dependencies that gracefully degrade to
  `undefined`
- 📦 **`@Module()`** — declare module metadata (providers, imports, exports)
- 🌐 **`@Global()`** — make a module's exports available everywhere
- 🔧 **Dynamic Modules** — `forRoot()` / `forFeature()` pattern for configurable
  modules
- 🎭 **Four provider types** — class, value, factory, existing (alias)
- 📐 **Scopes** — singleton (default) and transient
- 🔄 **Lifecycle hooks** — `OnModuleInit`, `OnModuleDestroy`,
  `OnApplicationBootstrap`, `OnApplicationShutdown`, `BeforeApplicationShutdown`
- 🔗 **`forwardRef()`** — resolve circular module dependencies
- 🏭 **`ModuleRef.create()`** — dynamic instantiation outside the DI flow
- 🚀 **Entry providers** — eager initialization for side-effect providers
- ⚙️ **Application config** — global settings injected as `APP_CONFIG`
- 🌍 **Global application singleton** — React integration without prop drilling
- ⚡ **`RegistryScanner`** — compile-time alternative to runtime reflection
- ⚛️ **React hooks** — `useInject`, `useOptionalInject`, `useContainer`

---

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Decorators](#decorators)
  - [Provider Types](#provider-types)
  - [Modules](#modules)
  - [Dynamic Modules](#dynamic-modules)
  - [Scopes](#scopes)
  - [Lifecycle Hooks](#lifecycle-hooks)
- [Application Bootstrap](#application-bootstrap)
  - [Basic Bootstrap](#basic-bootstrap)
  - [Application Options](#application-options)
  - [Application Config](#application-config)
  - [Graceful Shutdown](#graceful-shutdown)
- [React Integration](#react-integration)
  - [ContainerProvider](#containerprovider)
  - [useInject](#useinject)
  - [useOptionalInject](#useoptionalinject)
  - [useContainer](#usecontainer)
- [Advanced Features](#advanced-features)
  - [Circular Dependencies](#circular-dependencies)
  - [Optional Dependencies](#optional-dependencies)
  - [Property Injection](#property-injection)
  - [Entry Providers](#entry-providers)
  - [ModuleRef.create()](#modulerefcreate)
  - [Global Modules](#global-modules)
  - [Transient Scope](#transient-scope)
- [API Reference](#api-reference)
- [tsconfig Requirements](#tsconfig-requirements)

---

## Installation

```bash
# pnpm
pnpm add @stackra/ts-container reflect-metadata

# npm
npm install @stackra/ts-container reflect-metadata

# yarn
yarn add @stackra/ts-container reflect-metadata
```

---

## Quick Start

**1. Configure TypeScript**

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  },
}
```

**2. Import the polyfill once at your entry point**

```typescript
// main.ts — must be the very first import
import "reflect-metadata";
```

**3. Define services and a module**

```typescript
import { Injectable, Inject, Module, Application } from "@stackra/ts-container";

@Injectable()
class LoggerService {
  log(msg: string) {
    console.log(`[LOG] ${msg}`);
  }
}

@Injectable()
class UserService {
  constructor(private logger: LoggerService) {}

  getUser(id: string) {
    this.logger.log(`Getting user ${id}`);
    return { id, name: "Alice" };
  }
}

@Module({
  providers: [LoggerService, UserService],
  exports: [UserService],
})
class AppModule {}

// Bootstrap
const app = await Application.create(AppModule);
const userService = app.get(UserService);
userService.getUser("123");

await app.close();
```

---

## Core Concepts

### Decorators

#### `@Injectable(options?)`

Marks a class as a DI-managed provider. Required on any class that needs
dependencies injected or that will be injected into other classes.

```typescript
import { Injectable, Scope } from "@stackra/ts-container";

// Singleton (default) — one instance for the whole app
@Injectable()
class ConfigService {}

// Transient — new instance per injection point
@Injectable({ scope: Scope.TRANSIENT })
class RequestLogger {
  readonly id = Math.random();
}
```

#### `@Inject(token)`

Explicitly specifies the injection token for a constructor parameter or class
property. Required when the token is a string or symbol, or when injecting by
interface (which is erased at runtime).

```typescript
const DB_CONFIG = Symbol("DB_CONFIG");

@Injectable()
class DatabaseService {
  constructor(
    @Inject(DB_CONFIG) private config: DbConfig,
    @Inject("API_URL") private apiUrl: string,
  ) {}
}
```

#### `@Optional()`

Marks a dependency as optional. If the container cannot resolve it, `undefined`
is injected instead of throwing.

```typescript
@Injectable()
class AnalyticsService {
  constructor(@Optional() @Inject(RedisManager) private redis?: RedisManager) {
    // redis is undefined if RedisModule is not imported
  }
}
```

#### `@Module(metadata)`

Declares a module with its providers, imports, and exports.

```typescript
@Module({
  imports: [ConfigModule], // modules whose exports are available here
  providers: [UserService], // providers scoped to this module
  exports: [UserService], // providers available to importing modules
  entryProviders: [EventBusService], // eagerly instantiated on bootstrap
})
class UserModule {}
```

#### `@Global()`

Makes a module's exported providers available to all other modules without
explicit imports. Use sparingly — good for config, logging, and database
modules.

```typescript
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}
```

---

### Provider Types

All four provider forms can be mixed in the `providers` array:

```typescript
@Module({
  providers: [
    // 1. Class shorthand — most common
    UserService,

    // 2. Class provider — bind a token to a class
    { provide: "IUserRepo", useClass: PostgresUserRepository },

    // 3. Value provider — bind a token to a pre-existing value
    { provide: "API_URL", useValue: "https://api.example.com" },
    { provide: DB_CONFIG, useValue: { host: "localhost", port: 5432 } },

    // 4. Factory provider — bind a token to a factory function
    {
      provide: DbConnection,
      useFactory: async (config: DbConfig) => {
        return await createConnection(config);
      },
      inject: [DB_CONFIG],
    },

    // 5. Existing (alias) — bind a token to another token
    { provide: CACHE_SERVICE, useExisting: CacheManager },
  ],
})
class AppModule {}
```

---

### Modules

Modules are the organizational unit of the DI system. Each module declares what
it provides and what it needs from other modules.

```typescript
// feature/user/user.module.ts
@Module({
  imports: [DatabaseModule], // get DbConnection from DatabaseModule
  providers: [UserRepository, UserService],
  exports: [UserService], // only UserService is visible to importers
})
class UserModule {}

// app.module.ts
@Module({
  imports: [ConfigModule.forRoot({ apiUrl: "..." }), UserModule, OrderModule],
})
class AppModule {}
```

---

### Dynamic Modules

Dynamic modules allow configurable, reusable modules via `forRoot()` and
`forFeature()` static factory methods.

```typescript
interface CacheConfig {
  ttl: number;
  maxSize: number;
}

const CACHE_CONFIG = Symbol("CACHE_CONFIG");

@Module({})
class CacheModule {
  static forRoot(config: CacheConfig): DynamicModule {
    return {
      module: CacheModule,
      global: true,
      providers: [{ provide: CACHE_CONFIG, useValue: config }, CacheManager],
      exports: [CacheManager],
    };
  }

  static forFeature(namespace: string): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        {
          provide: `CACHE_${namespace}`,
          useFactory: (manager: CacheManager) => manager.namespace(namespace),
          inject: [CacheManager],
        },
      ],
      exports: [`CACHE_${namespace}`],
    };
  }
}

// Usage
@Module({
  imports: [
    CacheModule.forRoot({ ttl: 3600, maxSize: 1000 }),
    CacheModule.forFeature("users"),
  ],
})
class AppModule {}
```

---

### Scopes

```typescript
import { Injectable, Scope } from "@stackra/ts-container";

// DEFAULT — singleton, one instance for the whole application
@Injectable()
class ConfigService {}

// TRANSIENT — new instance created for every injection point
@Injectable({ scope: Scope.TRANSIENT })
class RequestContext {
  readonly id = crypto.randomUUID();
}
```

| Scope             | Value | Behaviour                                 |
| ----------------- | ----- | ----------------------------------------- |
| `Scope.DEFAULT`   | `0`   | One instance shared across the entire app |
| `Scope.TRANSIENT` | `1`   | New instance per injection point          |

---

### Lifecycle Hooks

Implement lifecycle interfaces to hook into the bootstrap and shutdown
sequences.

```typescript
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  BeforeApplicationShutdown,
} from "@stackra/ts-container";

@Injectable()
class DatabaseService
  implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap
{
  private connection: Connection;

  // Called after all providers in the module are instantiated
  async onModuleInit() {
    this.connection = await createConnection();
    console.log("DB connected");
  }

  // Called after ALL modules have been initialized
  async onApplicationBootstrap() {
    await this.connection.runMigrations();
    console.log("Migrations complete");
  }

  // Called during app.close() — final cleanup
  async onModuleDestroy() {
    await this.connection.close();
    console.log("DB disconnected");
  }
}

@Injectable()
class HttpServer implements BeforeApplicationShutdown, OnApplicationShutdown {
  // Called first — stop accepting new requests
  async beforeApplicationShutdown(signal?: string) {
    console.log(`Preparing for shutdown (${signal})`);
    await this.stopAcceptingConnections();
  }

  // Called second — drain and close
  async onApplicationShutdown(signal?: string) {
    await this.drainConnections();
  }
}
```

**Bootstrap order:**

1. All providers instantiated
2. Entry providers resolved
3. `onModuleInit()` — breadth-first by module distance from root
4. `onApplicationBootstrap()` — breadth-first by module distance

**Shutdown order (`app.close()`):**

1. `beforeApplicationShutdown(signal)` — reverse module order
2. `onApplicationShutdown(signal)` — reverse module order
3. `onModuleDestroy()` — reverse module order

---

## Application Bootstrap

### Basic Bootstrap

```typescript
import "reflect-metadata";
import { Application } from "@stackra/ts-container";

const app = await Application.create(AppModule);

// Resolve providers
const userService = app.get(UserService);
const apiUrl = app.get<string>("API_URL");

// Check existence without throwing
const analytics = app.getOptional(AnalyticsService);

// Check if registered
if (app.has(RedisManager)) {
  const redis = app.get(RedisManager);
}

// Resolve from a specific module
const cache = app.select(CacheModule, CacheManager);

// Graceful shutdown
await app.close();
```

### Application Options

```typescript
const app = await Application.create(AppModule, {
  // Expose app on window for browser devtools (auto-detected in dev)
  debug: true,
  globalName: "__MY_APP__", // window.__MY_APP__ = app

  // Global config — injected as 'APP_CONFIG' everywhere
  config: {
    apiUrl: "https://api.example.com",
    featureFlags: { newCheckout: true },
    environment: "production",
  },

  // Called after full bootstrap
  onReady: async (ctx) => {
    console.log("App ready!");
    await ctx.get(AnalyticsService).track("app_start");
  },
});
```

### Application Config

Pass a `config` object to `Application.create()` and inject it anywhere with the
`'APP_CONFIG'` token:

```typescript
// Bootstrap
const app = await Application.create(AppModule, {
  config: {
    apiUrl: "https://api.example.com",
    featureFlags: { newUI: true },
  },
});

// Inject in any service
@Injectable()
class ApiService {
  constructor(@Inject("APP_CONFIG") private config: Record<string, unknown>) {
    console.log(this.config.apiUrl); // 'https://api.example.com'
  }
}
```

### Graceful Shutdown

```typescript
const app = await Application.create(AppModule);

// Browser
window.addEventListener("beforeunload", () => app.close());

// Node.js
process.on("SIGTERM", async () => {
  await app.close("SIGTERM");
  process.exit(0);
});
```

---

## React Integration

### ContainerProvider

Wrap your component tree with `<ContainerProvider>` to make the DI container
available to all child components.

```tsx
// main.tsx
import "reflect-metadata";
import { Application, ContainerProvider } from "@stackra/ts-container";
import ReactDOM from "react-dom/client";

// Option 1 — global app (recommended, no props needed)
await Application.create(AppModule);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ContainerProvider>
    <App />
  </ContainerProvider>,
);

// Option 2 — explicit context prop
const app = await Application.create(AppModule);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ContainerProvider context={app}>
    <App />
  </ContainerProvider>,
);
```

### useInject

Resolve a provider from the container. Throws if not found. Result is memoized.

```tsx
import { useInject } from "@stackra/ts-container";

function UserProfile({ userId }: { userId: string }) {
  const userService = useInject(UserService);
  const [user, setUser] = useState(null);

  useEffect(() => {
    userService.getUser(userId).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}

// Inject by symbol token
function CacheStatus() {
  const config = useInject<CacheConfig>(CACHE_CONFIG);
  return <div>TTL: {config.ttl}s</div>;
}
```

### useOptionalInject

Like `useInject` but returns `undefined` instead of throwing if not found.

```tsx
import { useOptionalInject } from "@stackra/ts-container";

function AnalyticsWidget() {
  const tracker = useOptionalInject(AnalyticsService);

  if (!tracker) return null; // analytics not configured

  return <button onClick={() => tracker.track("click")}>Track</button>;
}
```

### useContainer

Access the raw `ContainerResolver` for advanced use cases.

```tsx
import { useContainer } from "@stackra/ts-container";

function DebugPanel() {
  const container = useContainer();

  return (
    <div>
      <p>Redis: {container.has(RedisManager) ? "✅" : "❌"}</p>
      <p>Analytics: {container.has(AnalyticsService) ? "✅" : "❌"}</p>
    </div>
  );
}
```

---

## Advanced Features

### Circular Dependencies

Use `forwardRef()` when two modules import each other:

```typescript
import { forwardRef } from "@stackra/ts-container";

// cats.module.ts
@Module({
  imports: [forwardRef(() => DogsModule)],
  providers: [CatsService],
  exports: [CatsService],
})
class CatsModule {}

// dogs.module.ts
@Module({
  imports: [forwardRef(() => CatsModule)],
  providers: [DogsService],
  exports: [DogsService],
})
class DogsModule {}
```

Also works on constructor parameters:

```typescript
@Injectable()
class CatsService {
  constructor(
    @Inject(forwardRef(() => DogsService)) private dogs: DogsService,
  ) {}
}
```

### Optional Dependencies

```typescript
@Injectable()
class NotificationService {
  constructor(
    private email: EmailService, // required
    @Optional() private sms?: SmsService, // optional
    @Optional() @Inject(PUSH_CONFIG) private push?: PushConfig, // optional token
  ) {}

  async notify(msg: string) {
    await this.email.send(msg);
    await this.sms?.send(msg); // only if SmsService is provided
  }
}
```

### Property Injection

```typescript
@Injectable()
class UserService {
  // Injected after construction
  @Inject(LoggerService)
  private logger!: LoggerService;

  @Optional()
  @Inject(AnalyticsService)
  private analytics?: AnalyticsService;
}
```

### Entry Providers

Providers listed in `entryProviders` are instantiated immediately on bootstrap,
even if nothing injects them. Use for side-effect providers.

```typescript
@Injectable()
class EventBusService implements OnModuleInit {
  async onModuleInit() {
    // Start listening for events immediately
    this.subscribe("user.created", this.handleUserCreated);
  }
}

@Module({
  providers: [EventBusService, UserService],
  entryProviders: [EventBusService], // ← instantiated eagerly
})
class AppModule {}
```

### ModuleRef.create()

Dynamically instantiate classes outside the normal DI flow, with or without
custom arguments:

```typescript
const moduleRef = app.getModuleRef(UserModule);

// With DI-resolved dependencies
const service = moduleRef.create(UserService);

// With custom arguments (bypasses DI)
const service = moduleRef.create(UserService, [customDb, customLogger]);
```

### Global Modules

Two ways to make a module global:

```typescript
// Option 1 — @Global() decorator
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

// Option 2 — global: true in DynamicModule
@Module({})
class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      global: true, // ← global per-registration
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
```

### Transient Scope

```typescript
@Injectable({ scope: Scope.TRANSIENT })
class RequestContext {
  readonly id = crypto.randomUUID();
  readonly startedAt = Date.now();
}

@Injectable()
class OrderService {
  // Each injection of RequestContext gets a fresh instance
  constructor(private ctx: RequestContext) {
    console.log(ctx.id); // unique per injection
  }
}
```

---

## API Reference

### Decorators

| Decorator       | Signature                                                            | Description                            |
| --------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `@Injectable()` | `(options?: ScopeOptions) => ClassDecorator`                         | Mark a class as a DI provider          |
| `@Inject()`     | `(token?: InjectionToken) => PropertyDecorator & ParameterDecorator` | Inject by explicit token               |
| `@Optional()`   | `() => PropertyDecorator & ParameterDecorator`                       | Mark dependency as optional            |
| `@Module()`     | `(metadata: ModuleMetadata) => ClassDecorator`                       | Declare module metadata                |
| `@Global()`     | `() => ClassDecorator`                                               | Make module exports globally available |

### Application

| Method                 | Signature                                        | Description                              |
| ---------------------- | ------------------------------------------------ | ---------------------------------------- |
| `Application.create()` | `(rootModule, options?) => Promise<Application>` | Bootstrap the application                |
| `app.get()`            | `<T>(token) => T`                                | Resolve a provider (throws if not found) |
| `app.getOptional()`    | `<T>(token) => T \| undefined`                   | Resolve a provider (returns undefined)   |
| `app.has()`            | `(token) => boolean`                             | Check if a provider is registered        |
| `app.select()`         | `<T>(moduleClass, token) => T`                   | Resolve from a specific module           |
| `app.getModuleRef()`   | `(moduleClass) => ModuleRef`                     | Get a module reference                   |
| `app.getContainer()`   | `() => ModuleContainer`                          | Get the raw container                    |
| `app.close()`          | `(signal?) => Promise<void>`                     | Graceful shutdown                        |

### React Hooks

| Hook                  | Signature                      | Description                            |
| --------------------- | ------------------------------ | -------------------------------------- |
| `useInject()`         | `<T>(token) => T`              | Resolve provider, throws if missing    |
| `useOptionalInject()` | `<T>(token) => T \| undefined` | Resolve provider, undefined if missing |
| `useContainer()`      | `() => ContainerResolver`      | Get raw container resolver             |

### Interfaces

| Interface                   | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `OnModuleInit`              | `onModuleInit(): any \| Promise<any>`                       |
| `OnModuleDestroy`           | `onModuleDestroy(): any \| Promise<any>`                    |
| `OnApplicationBootstrap`    | `onApplicationBootstrap(): void \| Promise<void>`           |
| `OnApplicationShutdown`     | `onApplicationShutdown(signal?): void \| Promise<void>`     |
| `BeforeApplicationShutdown` | `beforeApplicationShutdown(signal?): void \| Promise<void>` |
| `ContainerResolver`         | `get()`, `getOptional()`, `has()`                           |
| `IApplication`              | Full application interface                                  |

### Enums

| Enum    | Values                         |
| ------- | ------------------------------ |
| `Scope` | `DEFAULT = 0`, `TRANSIENT = 1` |

### Utilities

| Export                         | Description                                   |
| ------------------------------ | --------------------------------------------- |
| `forwardRef(fn)`               | Wrap a class reference to break circular deps |
| `hasOnModuleInit(instance)`    | Type guard for `OnModuleInit`                 |
| `hasOnModuleDestroy(instance)` | Type guard for `OnModuleDestroy`              |

---

## tsconfig Requirements

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true, // required — enables decorator syntax
    "emitDecoratorMetadata": true, // required — emits design:paramtypes
    "strictNullChecks": true, // recommended
    "strict": true, // recommended
  },
}
```

> `emitDecoratorMetadata` is what allows the injector to automatically resolve
> constructor dependencies without explicit `@Inject()` on every parameter.
> Without it, you must use `@Inject(Token)` on every constructor parameter.

---

## License

MIT © [Stackra](https://github.com/stackra-inc)
