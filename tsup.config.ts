/**
 * @fileoverview tsup build configuration for @stackra/ts-container
 *
 * Builds two entry points:
 * - `src/index.ts` → core DI (no React dependency)
 * - `src/react.ts` → React bindings (requires React peer dep)
 *
 * Uses the classic JSX transform with a React banner to ensure
 * `React.createElement` calls resolve correctly when React is external.
 *
 * @module @stackra/ts-container
 * @see https://tsup.egoist.dev/
 */

import { basePreset as preset } from "@stackra/tsup-config";

const reactBanner = "import React from 'react';";

export default {
  ...preset,
  entry: ["src/index.ts", "src/react.ts"],
  splitting: true,
  format: ["esm"],
  tsconfig: "./tsconfig.json",
  external: ["@stackra/contracts"],
  banner: {
    js: reactBanner,
  },
  esbuildOptions(options) {
    options.jsx = "transform";
    options.jsxFactory = "React.createElement";
    options.jsxFragment = "React.Fragment";
  },
};
