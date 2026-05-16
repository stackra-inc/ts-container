/**
 * Unit tests for all decorator behaviors.
 *
 * Tests: Injectable, Inject, Optional, Module, Global, SetMetadata
 *
 * @module __tests__/unit/decorators
 */

import { describe, it, expect } from "vitest";
import { getMetadata } from "@vivtel/metadata";

import { Injectable } from "@/decorators/injectable.decorator";
import { Inject } from "@/decorators/inject.decorator";
import { Optional } from "@/decorators/optional.decorator";
import { Module } from "@/decorators/module.decorator";
import { Global } from "@/decorators/global.decorator";
import { SetMetadata } from "@/decorators/set-metadata.decorator";
import {
  INJECTABLE_WATERMARK,
  SCOPE_OPTIONS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
  OPTIONAL_DEPS_METADATA,
  PROPERTY_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  MODULE_METADATA,
  GLOBAL_MODULE_METADATA,
} from "@/constants";
import { Scope } from "@/enums/scope.enum";

describe("@Injectable()", () => {
  it("sets the injectable watermark on the class", () => {
    @Injectable()
    class TestService {}

    const watermark = getMetadata<boolean>(INJECTABLE_WATERMARK, TestService);
    expect(watermark).toBe(true);
  });

  it("stores scope options as metadata when provided", () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class TransientService {}

    const options = getMetadata<{ scope: Scope }>(SCOPE_OPTIONS_METADATA, TransientService);
    expect(options).toEqual({ scope: Scope.TRANSIENT });
  });

  it("stores undefined scope options when no options provided", () => {
    @Injectable()
    class DefaultService {}

    const options = getMetadata(SCOPE_OPTIONS_METADATA, DefaultService);
    expect(options).toBeUndefined();
  });
});

describe("@Inject()", () => {
  it("stores explicit token for constructor parameter", () => {
    const TOKEN = Symbol("TOKEN");

    @Injectable()
    class TestService {
      constructor(@Inject(TOKEN) public dep: any) {}
    }

    const deps = getMetadata<Array<{ index: number; param: any }>>(
      SELF_DECLARED_DEPS_METADATA,
      TestService,
    );
    expect(deps).toEqual(expect.arrayContaining([{ index: 0, param: TOKEN }]));
  });

  it("stores multiple constructor parameter tokens", () => {
    const TOKEN_A = Symbol("A");
    const TOKEN_B = Symbol("B");

    @Injectable()
    class TestService {
      constructor(
        @Inject(TOKEN_A) public a: any,
        @Inject(TOKEN_B) public b: any,
      ) {}
    }

    const deps = getMetadata<Array<{ index: number; param: any }>>(
      SELF_DECLARED_DEPS_METADATA,
      TestService,
    );
    expect(deps).toHaveLength(2);
    expect(deps).toEqual(
      expect.arrayContaining([
        { index: 0, param: TOKEN_A },
        { index: 1, param: TOKEN_B },
      ]),
    );
  });

  it("stores property injection metadata", () => {
    const TOKEN = Symbol("PROP_TOKEN");

    @Injectable()
    class TestService {
      @Inject(TOKEN)
      public myProp!: any;
    }

    const props = getMetadata<Array<{ key: string | symbol; type: any }>>(
      PROPERTY_DEPS_METADATA,
      TestService,
    );
    expect(props).toEqual(expect.arrayContaining([{ key: "myProp", type: TOKEN }]));
  });

  it("resolves forward references for constructor parameters", () => {
    class LazyRef {}
    const forwardRef = { forwardRef: () => LazyRef };

    @Injectable()
    class TestService {
      constructor(@Inject(forwardRef as any) public dep: any) {}
    }

    const deps = getMetadata<Array<{ index: number; param: any }>>(
      SELF_DECLARED_DEPS_METADATA,
      TestService,
    );
    expect(deps).toEqual(expect.arrayContaining([{ index: 0, param: LazyRef }]));
  });
});

describe("@Optional()", () => {
  it("marks a constructor parameter as optional", () => {
    @Injectable()
    class TestService {
      constructor(@Optional() public dep: any) {}
    }

    const optionals = getMetadata<number[]>(OPTIONAL_DEPS_METADATA, TestService);
    expect(optionals).toContain(0);
  });

  it("marks multiple constructor parameters as optional", () => {
    @Injectable()
    class TestService {
      constructor(
        @Optional() public a: any,
        public b: any,
        @Optional() public c: any,
      ) {}
    }

    const optionals = getMetadata<number[]>(OPTIONAL_DEPS_METADATA, TestService);
    expect(optionals).toContain(0);
    expect(optionals).toContain(2);
    expect(optionals).not.toContain(1);
  });

  it("marks a property as optional", () => {
    @Injectable()
    class TestService {
      @Optional()
      public myProp!: any;
    }

    const optionals = getMetadata<Array<string | symbol>>(
      OPTIONAL_PROPERTY_DEPS_METADATA,
      TestService,
    );
    expect(optionals).toContain("myProp");
  });
});

describe("@Module()", () => {
  it("stores imports metadata", () => {
    class ImportedModule {}

    @Module({ imports: [ImportedModule] })
    class TestModule {}

    const imports = getMetadata<any[]>(MODULE_METADATA.IMPORTS, TestModule);
    expect(imports).toEqual([ImportedModule]);
  });

  it("stores providers metadata", () => {
    class TestService {}

    @Module({ providers: [TestService] })
    class TestModule {}

    const providers = getMetadata<any[]>(MODULE_METADATA.PROVIDERS, TestModule);
    expect(providers).toEqual([TestService]);
  });

  it("stores exports metadata", () => {
    class TestService {}

    @Module({ exports: [TestService] })
    class TestModule {}

    const exports = getMetadata<any[]>(MODULE_METADATA.EXPORTS, TestModule);
    expect(exports).toEqual([TestService]);
  });

  it("stores entryProviders metadata", () => {
    class EagerService {}

    @Module({ entryProviders: [EagerService] })
    class TestModule {}

    const entry = getMetadata<any[]>(MODULE_METADATA.ENTRY_PROVIDERS, TestModule);
    expect(entry).toEqual([EagerService]);
  });

  it("throws on invalid property keys", () => {
    expect(() => {
      @Module({ invalid: true } as any)
      class BadModule {}
      void BadModule;
    }).toThrow(/Invalid property 'invalid'/);
  });

  it("allows empty metadata", () => {
    expect(() => {
      @Module({})
      class EmptyModule {}
      void EmptyModule;
    }).not.toThrow();
  });
});

describe("@Global()", () => {
  it("sets the global module metadata flag", () => {
    @Global()
    @Module({})
    class GlobalModule {}

    const isGlobal = getMetadata<boolean>(GLOBAL_MODULE_METADATA, GlobalModule);
    expect(isGlobal).toBe(true);
  });
});

describe("SetMetadata()", () => {
  it("attaches metadata to a class", () => {
    @SetMetadata("roles", ["admin"])
    @Injectable()
    class TestController {}

    const roles = getMetadata<string[]>("roles", TestController);
    expect(roles).toEqual(["admin"]);
  });

  it("attaches metadata to a method", () => {
    class TestController {
      @SetMetadata("cache", { ttl: 300 })
      getUsers() {}
    }

    const instance = new TestController();
    const cache = getMetadata<{ ttl: number }>("cache", instance.getUsers as any);
    expect(cache).toEqual({ ttl: 300 });
  });

  it("supports boolean metadata values", () => {
    @SetMetadata("isPublic", true)
    @Injectable()
    class PublicController {}

    const isPublic = getMetadata<boolean>("isPublic", PublicController);
    expect(isPublic).toBe(true);
  });
});
