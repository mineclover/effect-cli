import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import { type FileInfo, FileSystem } from "./FileSystem.js"

export const make = (mockFiles: ReadonlyArray<FileInfo>) =>
  Effect.gen(function*() {
    const files = yield* Ref.make(mockFiles)

    return FileSystem.of({
      listDirectory: (_path: string) => Ref.get(files),
      readFileContent: (_filePath: string) => Effect.succeed("mock file content"),
      findFiles: (_searchPath: string, _pattern: string) => Effect.succeed([])
    })
  })

export const layer = (mockFiles: ReadonlyArray<FileInfo>) => Layer.effect(FileSystem, make(mockFiles))
