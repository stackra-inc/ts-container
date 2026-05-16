/**
 * Unit tests for factory providers.
 *
 * Tests: useFactory, inject dependencies, async factories, factory with deps
 *
 * @module __tests__/unit/factory-providers
 */

import { describe, it, expect, vi } from "vitest";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Module } from "@/decorators/module.decorator";
import { ApplicationFactory } from "@/factories/application-factory.factory";

describe("Factory Providers", () => {
  describe("Basic factory", () => {
    it("should resolve a factory provider with useFactory", async () => {
      const TOKEN = Symbol("FACTORY_VALUE");

      @Module({
        providers: [{ provide: TOKEN, useFactory: () => 42 }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const value = app.get(TOKEN);

      expect(value).toBe(42);
    });

    it("should resolve a factory that returns an object", async () => {
      const CONFIG = Symbol("CONFIG");

      @Module({
        providers: [
          {
            provide: CONFIG,
            useFactory: () => ({ host: "localhost", port: 3000 }),
          },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const config = app.get(CONFIG);

      expect(config).toEqual({ host: "localhost", port: 3000 });
    });
  });

  describe("Factory with inject dependencies", () => {
    it("should inject dependencies into factory function", async () => {
      const DB_URL = Symbol("DB_URL");
      const DB_CLIENT = Symbol("DB_CLIENT");

      @Module({
        providers: [
          { provide: DB_URL, useValue: "postgres://localhost/test" },
          {
            provide: DB_CLIENT,
            useFactory: (url: string) => ({ url, connected: true }),
            inject: [DB_URL],
          },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const client = app.get(DB_CLIENT);

      expect(client).toEqual({ url: "postgres://localhost/test", connected: true });
    });

    it("should inject class providers into factory", async () => {
      @Injectable()
      class ConfigService {
        getApiUrl() {
          return "https://api.example.com";
        }
      }

      const HTTP_CLIENT = Symbol("HTTP_CLIENT");

      @Module({
        providers: [
          ConfigService,
          {
            provide: HTTP_CLIENT,
            useFactory: (config: ConfigService) => ({
              baseUrl: config.getApiUrl(),
            }),
            inject: [ConfigService],
          },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const client = app.get(HTTP_CLIENT);

      expect(client).toEqual({ baseUrl: "https://api.example.com" });
    });

    it("should inject multiple dependencies into factory", async () => {
      const HOST = Symbol("HOST");
      const PORT = Symbol("PORT");
      const URL = Symbol("URL");

      @Module({
        providers: [
          { provide: HOST, useValue: "localhost" },
          { provide: PORT, useValue: 8080 },
          {
            provide: URL,
            useFactory: (host: string, port: number) => `http://${host}:${port}`,
            inject: [HOST, PORT],
          },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const url = app.get(URL);

      expect(url).toBe("http://localhost:8080");
    });
  });

  describe("Async factory providers", () => {
    it("should resolve async factory providers", async () => {
      const ASYNC_VALUE = Symbol("ASYNC_VALUE");

      @Module({
        providers: [
          {
            provide: ASYNC_VALUE,
            useFactory: async () => {
              await new Promise((r) => setTimeout(r, 10));
              return "async-result";
            },
          },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const value = app.get(ASYNC_VALUE);

      expect(value).toBe("async-result");
    });

    it("should resolve async factory with injected dependencies", async () => {
      const BASE_URL = Symbol("BASE_URL");
      const API_CLIENT = Symbol("API_CLIENT");

      @Module({
        providers: [
          { provide: BASE_URL, useValue: "https://api.test" },
          {
            provide: API_CLIENT,
            useFactory: async (baseUrl: string) => {
              await new Promise((r) => setTimeout(r, 5));
              return { baseUrl, initialized: true };
            },
            inject: [BASE_URL],
          },
        ],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const client = app.get(API_CLIENT);

      expect(client).toEqual({ baseUrl: "https://api.test", initialized: true });
    });
  });

  describe("Factory provider caching", () => {
    it("should call factory only once for singleton scope", async () => {
      const factory = vi.fn(() => ({ id: Math.random() }));
      const TOKEN = Symbol("SINGLETON_FACTORY");

      @Module({
        providers: [{ provide: TOKEN, useFactory: factory }],
      })
      class TestModule {}

      const app = await ApplicationFactory.create(TestModule);
      const instance1 = app.get(TOKEN);
      const instance2 = app.get(TOKEN);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
    });
  });
});
