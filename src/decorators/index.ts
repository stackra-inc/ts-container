/**
 * Decorators Barrel Export
 *
 * All class and parameter decorators for the DI system. These decorators
 * write metadata that the scanner and injector read during bootstrap.
 *
 * - {@link Injectable} — Marks a class as a DI-managed provider
 * - {@link Inject} — Specifies an explicit injection token for a parameter or property
 * - {@link Optional} — Marks a dependency as optional (injects `undefined` on failure)
 * - {@link Module} — Defines a module with imports, providers, and exports
 * - {@link Global} — Makes a module's exports available globally
 * - {@link SetMetadata} — Attaches arbitrary key-value metadata to classes/methods
 *
 * @module decorators
 */

export { Inject } from "./inject.decorator";
export { Module } from "./module.decorator";
export { Global } from "./global.decorator";
export { Optional } from "./optional.decorator";
export { Injectable } from "./injectable.decorator";
export { SetMetadata } from "./set-metadata.decorator";
