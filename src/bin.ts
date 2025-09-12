#!/usr/bin/env node

import { DevTools } from "@effect/experimental"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { run } from "./Cli.js"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import * as NodeContext from "@effect/platform-node/NodeContext"
import { FileSystemLive } from "./services/FileSystemLive.js"

/**
 * Phase 3.3: CLI Layer Integration
 * 
 * Minimal CLI setup for testing basic functionality
 * - Just the platform essentials without complex queue dependencies
 */

const DevToolsLive = DevTools.layer()

// Absolute minimal layer - just platform services without complex queue dependencies
const AppLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeFileSystem.layer,
  NodePath.layer
)

// Complete application layer with queue integration
const FullAppLayer = AppLayer.pipe(
  Layer.provide(DevToolsLive)
)

run(process.argv).pipe(
  Effect.provide(FullAppLayer),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
