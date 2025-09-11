import { Effect } from "effect"
import { describe, expect, it, vi } from "vitest"
import { listCommand } from "../../src/examples/ListCommand.js"
import * as FileSystemTest from "../../src/services/FileSystemTest.js"

describe("ListCommand", () => {
  it("should list files in a directory", () => {
    const mockFiles = [
      { name: "directory1", isDirectory: true, size: 0n },
      { name: "file1.txt", isDirectory: false, size: 1024n }
    ]

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    const handler = listCommand.handler({ all: false, long: false, path: "." })

    const effect = Effect.provide(handler, FileSystemTest.layer(mockFiles))

    Effect.runSync(effect)

    expect(logSpy).toHaveBeenCalledWith("📁 directory1/")
    expect(logSpy).toHaveBeenCalledWith("📄 file1.txt")
    expect(logSpy).toHaveBeenCalledWith("\nTotal: 1 files, 1 directories")

    logSpy.mockRestore()
  })
})
