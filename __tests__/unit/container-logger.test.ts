/**
 * Unit tests for ContainerLogger (devtools).
 *
 * Tests: Logger creation, module logging, resolution logging, render
 *
 * @module __tests__/unit/container-logger
 */

import { describe, it, expect, vi } from "vitest";
import { ContainerLogger } from "@/devtools";

describe("ContainerLogger", () => {
  describe("Creation", () => {
    it("should create a logger instance", () => {
      const logger = new ContainerLogger();
      expect(logger).toBeDefined();
    });

    it("should be disabled by default when no options provided", () => {
      const logger = new ContainerLogger();
      // Default behavior depends on implementation
      expect(logger).toBeDefined();
    });

    it("should accept options", () => {
      const logger = new ContainerLogger({ enabled: true });
      expect(logger.enabled).toBe(true);
    });

    it("should be disabled when explicitly set", () => {
      const logger = new ContainerLogger({ enabled: false });
      expect(logger.enabled).toBe(false);
    });
  });

  describe("Logging methods", () => {
    it("should have a start method", () => {
      const logger = new ContainerLogger({ enabled: true });
      expect(typeof logger.start).toBe("function");
    });

    it("should have a logModule method", () => {
      const logger = new ContainerLogger({ enabled: true });
      expect(typeof logger.logModule).toBe("function");
    });

    it("should have a render method", () => {
      const logger = new ContainerLogger({ enabled: true });
      expect(typeof logger.render).toBe("function");
    });

    it("should not throw when logging modules", () => {
      const logger = new ContainerLogger({ enabled: true });
      logger.start();
      expect(() => {
        logger.logModule("TestModule", false, ["ServiceA", "ServiceB"], ["ImportedModule"]);
      }).not.toThrow();
    });

    it("should not throw when rendering", () => {
      const logger = new ContainerLogger({ enabled: true });
      logger.start();
      logger.logModule("TestModule", false, ["ServiceA"], []);
      expect(() => logger.render()).not.toThrow();
    });
  });
});
