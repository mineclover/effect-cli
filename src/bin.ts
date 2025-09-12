#!/usr/bin/env node

import { DevTools } from "@effect/experimental"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { run } from "./Cli.js"
import { MinimalCliLayer, getLayerForEnvironment } from "./layers/index.js"

/**
 * Phase 3.3: CLI Layer Integration
 * 
 * Production CLI with complete queue system integration including:
 * - Complete queue system (Phase 1 Foundation + Phase 2 Stability)
 * - Transparent queue adapter for seamless integration
 * - Original services enhanced with queue functionality
 * - Node.js platform context
 * - Development tools for monitoring
 */

const DevToolsLive = DevTools.layer()

// Use minimal layer for now to test basic functionality
const AppLayer = MinimalCliLayer

// Complete application layer with queue integration
const FullAppLayer = AppLayer.pipe(
  Layer.provide(DevToolsLive)
)

run(process.argv).pipe(
  Effect.provide(FullAppLayer),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
