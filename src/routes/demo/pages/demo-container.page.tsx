/**
 * @fileoverview Container Demo Page — interactive showcase of DI container features.
 *
 * Uses HeroUI Tabs to organize demos into sections. Each section
 * demonstrates a specific feature of the container package with live
 * interactive examples.
 *
 * @module @stackra/ts-container
 * @category Demo
 */

"use client";

import { useState, useCallback, type ReactElement } from "react";
import { Button, Chip, Tabs, Card, Switch, Input } from "@heroui/react";

/**
 * Main demo page for the container package.
 */
export function DemoContainerPage(): ReactElement {
  const [activeTab, setActiveTab] = useState("resolution");

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground mb-2">Container Demo</h1>
        <p className="text-sm text-default-500">
          Interactive showcase of <code className="text-foreground">@stackra/ts-container</code>.
          NestJS-style dependency injection for React and client-side applications.
        </p>
      </div>

      {/* Tabbed sections */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
        aria-label="Container Demo Sections"
      >
        <Tabs.List>
          <Tabs.Tab id="resolution">Resolution Tree</Tabs.Tab>
          <Tabs.Tab id="providers">Provider Listing</Tabs.Tab>
          <Tabs.Tab id="scopes">Scopes</Tabs.Tab>
          <Tabs.Tab id="lifecycle">Lifecycle Hooks</Tabs.Tab>
          <Tabs.Tab id="modules">Module Graph</Tabs.Tab>
          <Tabs.Tab id="testing">Testing Module</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="resolution">
          <ResolutionTreeDemo />
        </Tabs.Panel>
        <Tabs.Panel id="providers">
          <ProviderListingDemo />
        </Tabs.Panel>
        <Tabs.Panel id="scopes">
          <ScopeDemo />
        </Tabs.Panel>
        <Tabs.Panel id="lifecycle">
          <LifecycleDemo />
        </Tabs.Panel>
        <Tabs.Panel id="modules">
          <ModuleGraphDemo />
        </Tabs.Panel>
        <Tabs.Panel id="testing">
          <TestingModuleDemo />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

/* ── Section: Resolution Tree ─────────────────────────────────── */

function ResolutionTreeDemo(): ReactElement {
  const [resolving, setResolving] = useState(false);
  const [resolutionLog, setResolutionLog] = useState<
    Array<{ token: string; depth: number; time: string; status: "resolved" | "cached" }>
  >([]);

  const simulateResolution = () => {
    setResolving(true);
    setResolutionLog([]);

    const steps = [
      { token: "AppModule", depth: 0, status: "resolved" as const },
      { token: "ConfigService", depth: 1, status: "resolved" as const },
      { token: "LoggerService", depth: 1, status: "resolved" as const },
      { token: "DatabaseService", depth: 1, status: "resolved" as const },
      { token: "ConfigService", depth: 2, status: "cached" as const },
      { token: "UserRepository", depth: 2, status: "resolved" as const },
      { token: "UserService", depth: 1, status: "resolved" as const },
      { token: "LoggerService", depth: 2, status: "cached" as const },
      { token: "UserRepository", depth: 2, status: "cached" as const },
      { token: "AuthService", depth: 1, status: "resolved" as const },
      { token: "UserService", depth: 2, status: "cached" as const },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval);
        setResolving(false);
        return;
      }
      const step = steps[i];
      setResolutionLog((prev) => [...prev, { ...step, time: new Date().toLocaleTimeString() }]);
      i++;
    }, 200);
  };

  return (
    <Card className="p-6 mt-4">
      <h2 className="text-lg font-bold mb-4">DI Resolution Tree</h2>
      <p className="text-sm text-default-500 mb-4">
        Visualizes how the injector resolves dependencies recursively. Cached singletons are
        returned immediately without re-instantiation.
      </p>

      <Button variant="primary" onPress={simulateResolution} isDisabled={resolving}>
        {resolving ? "Resolving..." : "Simulate Bootstrap"}
      </Button>

      <div className="mt-4 rounded-lg bg-default-50 p-4 font-mono text-xs max-h-64 overflow-y-auto">
        {resolutionLog.length === 0 ? (
          <span className="text-default-400">
            Click "Simulate Bootstrap" to see the resolution tree...
          </span>
        ) : (
          resolutionLog.map((entry, i) => (
            <div key={i} className="py-0.5 flex items-center gap-2">
              <span className="text-default-400 w-20">{entry.time}</span>
              <span className="text-default-300">{"  ".repeat(entry.depth)}→</span>
              <span className={entry.status === "cached" ? "text-default-400" : "text-accent"}>
                {entry.token}
              </span>
              <Chip
                size="sm"
                color={entry.status === "cached" ? "default" : "success"}
                variant="soft"
              >
                {entry.status}
              </Chip>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-default-50 text-xs font-mono">
        <span className="text-default-500">// Resolution algorithm:</span>
        <br />
        {"1. Check own module providers"}
        <br />
        {"2. Check imported modules' exports (breadth-first)"}
        <br />
        {"3. Return cached singleton or create new instance"}
      </div>
    </Card>
  );
}

/* ── Section: Provider Listing ────────────────────────────────── */

function ProviderListingDemo(): ReactElement {
  const [filter, setFilter] = useState("");

  const providers = [
    { token: "ConfigService", type: "class", scope: "singleton", module: "ConfigModule" },
    { token: "CACHE_CONFIG", type: "value", scope: "singleton", module: "CacheModule" },
    { token: "LoggerService", type: "class", scope: "singleton", module: "LoggerModule" },
    { token: "HTTP_CLIENT", type: "factory", scope: "singleton", module: "HttpModule" },
    { token: "RequestLogger", type: "class", scope: "transient", module: "LoggerModule" },
    { token: "UserService", type: "class", scope: "singleton", module: "UserModule" },
    { token: "UserRepository", type: "factory", scope: "singleton", module: "UserModule" },
    { token: "AuthService", type: "class", scope: "singleton", module: "AuthModule" },
    { token: "API_URL", type: "value", scope: "singleton", module: "AppModule" },
    { token: "EventBus", type: "class", scope: "singleton", module: "EventsModule" },
    { token: "I18N_MANAGER", type: "factory", scope: "singleton", module: "I18nModule" },
    { token: "RouterService", type: "class", scope: "singleton", module: "RouterModule" },
  ];

  const filtered = providers.filter(
    (p) =>
      p.token.toLowerCase().includes(filter.toLowerCase()) ||
      p.module.toLowerCase().includes(filter.toLowerCase()) ||
      p.type.includes(filter.toLowerCase()),
  );

  const typeColor = (type: string) => {
    switch (type) {
      case "class":
        return "accent";
      case "value":
        return "success";
      case "factory":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Card className="p-6 mt-4">
      <h2 className="text-lg font-bold mb-4">Provider Registry</h2>
      <p className="text-sm text-default-500 mb-4">
        All registered providers in the container. Filter by token name, module, or type.
      </p>

      <Input
        label="Filter providers"
        value={filter}
        onValueChange={setFilter}
        className="mb-4 max-w-sm"
        placeholder="Search by token, module, or type..."
      />

      <div className="flex gap-2 mb-4">
        <Chip size="sm" variant="soft" color="accent">
          class: {providers.filter((p) => p.type === "class").length}
        </Chip>
        <Chip size="sm" variant="soft" color="success">
          value: {providers.filter((p) => p.type === "value").length}
        </Chip>
        <Chip size="sm" variant="soft" color="warning">
          factory: {providers.filter((p) => p.type === "factory").length}
        </Chip>
        <Chip size="sm" variant="soft">
          total: {providers.length}
        </Chip>
      </div>

      <div className="rounded-lg border border-default-100 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-default-50 text-xs font-semibold text-default-500">
          <span>Token</span>
          <span>Type</span>
          <span>Scope</span>
          <span>Module</span>
        </div>
        {filtered.map((p, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 px-4 py-2 border-t border-default-50 text-xs"
          >
            <span className="font-mono text-foreground">{p.token}</span>
            <Chip size="sm" color={typeColor(p.type) as any} variant="soft">
              {p.type}
            </Chip>
            <span className="text-default-500">{p.scope}</span>
            <span className="text-default-400">{p.module}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Section: Scope Visualization ─────────────────────────────── */

function ScopeDemo(): ReactElement {
  const [singletonId] = useState(() => Math.random().toFixed(6));
  const [transientIds, setTransientIds] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(0);

  const resolveTransient = () => {
    setTransientIds((prev) => [...prev.slice(-7), Math.random().toFixed(6)]);
    setRequestCount((c) => c + 1);
  };

  return (
    <Card className="p-6 mt-4">
      <h2 className="text-lg font-bold mb-4">Scope Visualization</h2>
      <p className="text-sm text-default-500 mb-4">
        Compare singleton (shared instance) vs transient (new instance per injection) scopes.
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Singleton */}
        <div className="rounded-lg border border-default-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Chip size="sm" color="success" variant="soft">
              Scope.DEFAULT
            </Chip>
            <span className="text-sm font-semibold">Singleton</span>
          </div>
          <p className="text-xs text-default-500 mb-3">
            Same instance returned every time. Created once, cached forever.
          </p>
          <div className="rounded bg-default-50 p-3 font-mono text-xs">
            <div className="text-default-400">Instance ID:</div>
            <div className="text-accent text-lg font-bold">{singletonId}</div>
            <div className="text-default-400 mt-2">
              Always the same — no matter how many times you resolve it.
            </div>
          </div>
        </div>

        {/* Transient */}
        <div className="rounded-lg border border-default-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Chip size="sm" color="warning" variant="soft">
              Scope.TRANSIENT
            </Chip>
            <span className="text-sm font-semibold">Transient</span>
          </div>
          <p className="text-xs text-default-500 mb-3">
            New instance on every injection. Never cached.
          </p>
          <Button size="sm" variant="primary" onPress={resolveTransient} className="mb-3">
            Resolve (#{requestCount + 1})
          </Button>
          <div className="rounded bg-default-50 p-3 font-mono text-xs max-h-32 overflow-y-auto">
            {transientIds.length === 0 ? (
              <span className="text-default-400">Click resolve to create instances...</span>
            ) : (
              transientIds.map((id, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-default-400">#{i + 1}</span>{" "}
                  <span className="text-warning">{id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-default-50 text-xs font-mono">
        <span className="text-default-500">// Usage:</span>
        <br />
        {"@Injectable({ scope: Scope.TRANSIENT })"}
        <br />
        {"class RequestLogger { id = Math.random(); }"}
      </div>
    </Card>
  );
}

/* ── Section: Lifecycle Hooks ─────────────────────────────────── */

function LifecycleDemo(): ReactElement {
  const [phase, setPhase] = useState<string>("idle");
  const [log, setLog] = useState<Array<{ hook: string; provider: string; time: string }>>([]);

  const simulateBootstrap = () => {
    setLog([]);
    setPhase("scanning");

    const hooks = [
      { hook: "scan", provider: "AppModule", delay: 300 },
      { hook: "scan", provider: "UserModule", delay: 200 },
      { hook: "scan", provider: "AuthModule", delay: 200 },
      { hook: "instantiate", provider: "ConfigService", delay: 300 },
      { hook: "instantiate", provider: "LoggerService", delay: 200 },
      { hook: "instantiate", provider: "UserService", delay: 200 },
      { hook: "onModuleInit", provider: "ConfigService", delay: 400 },
      { hook: "onModuleInit", provider: "LoggerService", delay: 200 },
      { hook: "onModuleInit", provider: "UserService", delay: 200 },
      { hook: "onApplicationBootstrap", provider: "AppModule", delay: 300 },
    ];

    let i = 0;
    let totalDelay = 0;

    for (const step of hooks) {
      totalDelay += step.delay;
      const idx = i;
      setTimeout(() => {
        setLog((prev) => [
          ...prev,
          { hook: step.hook, provider: step.provider, time: new Date().toLocaleTimeString() },
        ]);
        if (idx < 3) setPhase("scanning");
        else if (idx < 6) setPhase("instantiating");
        else if (idx < 9) setPhase("onModuleInit");
        else setPhase("ready");
      }, totalDelay);
      i++;
    }
  };

  const simulateShutdown = () => {
    setPhase("shutting-down");
    const hooks = [
      { hook: "beforeApplicationShutdown", provider: "UserService" },
      { hook: "onApplicationShutdown", provider: "UserService" },
      { hook: "onModuleDestroy", provider: "UserService" },
      { hook: "onModuleDestroy", provider: "LoggerService" },
      { hook: "onModuleDestroy", provider: "ConfigService" },
    ];

    let delay = 0;
    for (const step of hooks) {
      delay += 250;
      setTimeout(() => {
        setLog((prev) => [
          ...prev,
          { hook: step.hook, provider: step.provider, time: new Date().toLocaleTimeString() },
        ]);
      }, delay);
    }
    setTimeout(() => setPhase("destroyed"), delay + 300);
  };

  const hookColor = (hook: string) => {
    if (hook.includes("scan")) return "default";
    if (hook.includes("instantiate")) return "accent";
    if (hook.includes("Init") || hook.includes("Bootstrap")) return "success";
    if (hook.includes("Shutdown") || hook.includes("Destroy")) return "danger";
    return "default";
  };

  return (
    <Card className="p-6 mt-4">
      <h2 className="text-lg font-bold mb-4">Lifecycle Hooks</h2>
      <p className="text-sm text-default-500 mb-4">
        Providers can implement lifecycle interfaces to run code at specific phases of the
        application lifecycle.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <Button variant="primary" onPress={simulateBootstrap}>
          Simulate Bootstrap
        </Button>
        <Button variant="secondary" color="danger" onPress={simulateShutdown}>
          Simulate Shutdown
        </Button>
        <Chip
          size="sm"
          color={phase === "ready" ? "success" : phase === "destroyed" ? "danger" : "warning"}
          variant="soft"
        >
          {phase}
        </Chip>
      </div>

      <div className="rounded-lg bg-default-50 p-4 font-mono text-xs max-h-64 overflow-y-auto">
        {log.length === 0 ? (
          <span className="text-default-400">
            Simulate bootstrap or shutdown to see lifecycle hooks...
          </span>
        ) : (
          log.map((entry, i) => (
            <div key={i} className="py-0.5 flex items-center gap-2">
              <span className="text-default-400 w-20">{entry.time}</span>
              <Chip size="sm" color={hookColor(entry.hook) as any} variant="soft">
                {entry.hook}
              </Chip>
              <span className="text-default-600">{entry.provider}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-default-50">
          <span className="font-semibold text-success">Bootstrap Order:</span>
          <br />
          scan → instantiate → onModuleInit → onApplicationBootstrap
        </div>
        <div className="p-3 rounded-lg bg-default-50">
          <span className="font-semibold text-danger">Shutdown Order:</span>
          <br />
          beforeApplicationShutdown → onApplicationShutdown → onModuleDestroy
        </div>
      </div>
    </Card>
  );
}

/* ── Section: Module Graph ────────────────────────────────────── */

function ModuleGraphDemo(): ReactElement {
  const modules = [
    {
      name: "AppModule",
      imports: ["UserModule", "AuthModule", "CacheModule"],
      isGlobal: false,
      providers: 2,
    },
    { name: "UserModule", imports: ["DatabaseModule"], isGlobal: false, providers: 3 },
    { name: "AuthModule", imports: ["UserModule"], isGlobal: false, providers: 2 },
    { name: "CacheModule", imports: [], isGlobal: true, providers: 4 },
    { name: "DatabaseModule", imports: [], isGlobal: true, providers: 2 },
    { name: "ConfigModule", imports: [], isGlobal: true, providers: 1 },
  ];

  const [selectedModule, setSelectedModule] = useState("AppModule");
  const selected = modules.find((m) => m.name === selectedModule);

  return (
    <Card className="p-6 mt-4">
      <h2 className="text-lg font-bold mb-4">Module Graph</h2>
      <p className="text-sm text-default-500 mb-4">
        Visualizes the module dependency graph. Global modules are available everywhere without
        explicit imports.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {modules.map((mod) => (
          <button
            key={mod.name}
            onClick={() => setSelectedModule(mod.name)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selectedModule === mod.name
                ? "border-accent/30 bg-accent/5"
                : "border-default-100 hover:border-default-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold">{mod.name}</span>
              {mod.isGlobal && (
                <Chip size="sm" color="warning" variant="soft">
                  global
                </Chip>
              )}
            </div>
            <div className="text-[10px] text-default-400">
              {mod.providers} providers · {mod.imports.length} imports
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-lg border border-default-100 p-4">
          <h3 className="text-sm font-semibold mb-2">{selected.name}</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-default-500 font-semibold">Imports:</span>
              <div className="mt-1 space-y-1">
                {selected.imports.length === 0 ? (
                  <span className="text-default-400">None (leaf module)</span>
                ) : (
                  selected.imports.map((imp) => (
                    <div key={imp} className="flex items-center gap-1">
                      <span className="text-accent">→</span> {imp}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <span className="text-default-500 font-semibold">Properties:</span>
              <div className="mt-1 space-y-1">
                <div>Providers: {selected.providers}</div>
                <div>Global: {selected.isGlobal ? "Yes" : "No"}</div>
                <div>Imports: {selected.imports.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Section: Testing Module ──────────────────────────────────── */

function TestingModuleDemo(): ReactElement {
  const [overrides, setOverrides] = useState<Array<{ token: string; type: string; value: string }>>(
    [{ token: "DatabaseService", type: "useValue", value: "{ query: mockFn() }" }],
  );
  const [newToken, setNewToken] = useState("");
  const [compiled, setCompiled] = useState(false);

  const addOverride = () => {
    if (newToken.trim()) {
      setOverrides((prev) => [...prev, { token: newToken, type: "useValue", value: "mockValue" }]);
      setNewToken("");
    }
  };

  const compile = () => {
    setCompiled(true);
    setTimeout(() => setCompiled(false), 2000);
  };

  return (
    <Card className="p-6 mt-4">
      <h2 className="text-lg font-bold mb-4">Testing Module</h2>
      <p className="text-sm text-default-500 mb-4">
        Override providers for testing. Replace real services with mocks using the fluent builder
        API.
      </p>

      <div className="flex gap-2 mb-4">
        <Input
          label="Provider token to override"
          value={newToken}
          onValueChange={setNewToken}
          className="flex-1"
          placeholder="e.g. HttpService"
        />
        <Button variant="secondary" onPress={addOverride}>
          Add Override
        </Button>
      </div>

      <div className="space-y-2 mb-4">
        {overrides.map((override, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-default-100 px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-foreground">{override.token}</span>
              <Chip size="sm" color="warning" variant="soft">
                {override.type}
              </Chip>
            </div>
            <span className="font-mono text-xs text-default-400">{override.value}</span>
          </div>
        ))}
      </div>

      <Button variant="primary" onPress={compile}>
        {compiled ? "✓ Compiled!" : "Compile Test Module"}
      </Button>

      <div className="mt-4 p-3 rounded-lg bg-default-50 text-xs font-mono">
        <span className="text-default-500">// Usage:</span>
        <br />
        {"const app = await TestingModule.create(AppModule)"}
        <br />
        {overrides.map((o, i) => (
          <span key={i}>
            {"  .overrideProvider(" + o.token + ")"}
            <br />
            {"  ." + o.type + "(" + o.value + ")"}
            <br />
          </span>
        ))}
        {"  .compile();"}
      </div>
    </Card>
  );
}
