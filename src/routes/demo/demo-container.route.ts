/**
 * @fileoverview Container Demo route — showcases DI container features.
 *
 * Single-page demo with tabbed sections covering:
 * - DI resolution tree visualization
 * - Provider listing and types
 * - Scope visualization (singleton vs transient)
 * - Lifecycle hooks demo
 * - Module graph
 *
 * @module @stackra/ts-container
 * @category Demo
 */

import { Route } from "@stackra/react-router";
import { DemoContainerPage } from "./pages";

/**
 * Container demo — full DI container subsystem showcase.
 */
@Route({
  path: "/demo/container",
  title: "Container Demo",
  label: "Container Demo",
  icon: "box",
  variant: "main",
  hideInMenu: false,
  order: 40,
})
export class DemoContainerRoute {
  public render(): any {
    return DemoContainerPage();
  }
}
