#!/usr/bin/env node

import { DevTools } from "@effect/experimental"
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { run } from "./Cli.js"
import { FileSystemLive } from "./services/FileSystemLive.js"

const DevToolsLive = DevTools.layer()
const AppLive = FileSystemLive.pipe(
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(NodePath.layer)
)

run(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  Effect.provide(AppLive),
  Effect.provide(DevToolsLive),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
