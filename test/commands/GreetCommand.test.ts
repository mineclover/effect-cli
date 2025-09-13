/**
 * GreetCommand Test Suite
 *
 * Comprehensive test suite for GreetCommand using proven working patterns.
 * Based on successful ListCommand and QueueSystem test patterns.
 *
 * @version 1.0.0
 * @created 2025-09-13
 */

import { Effect } from "effect"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { greetCommand } from "../../src/commands/GreetCommand.js"

// ============================================================================
// TEST SETUP
// ============================================================================

describe("GreetCommand", () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  // ==========================================================================
  // BASIC FUNCTIONALITY TESTS
  // ==========================================================================

  describe("Basic Functionality", () => {
    it("should greet with basic usage", () => {
      const handler = greetCommand.handler({
        name: "Alice",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Hello Alice! 👋")
      expect(logSpy).toHaveBeenCalledTimes(1)
    })

    it("should greet with informal style by default", () => {
      const handler = greetCommand.handler({
        name: "Bob",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Hello Bob! 👋")
    })
  })

  // ==========================================================================
  // FORMAL vs INFORMAL GREETING TESTS
  // ==========================================================================

  describe("Greeting Styles", () => {
    it("should use informal greeting when formal=false", () => {
      const handler = greetCommand.handler({
        name: "Charlie",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Hello Charlie! 👋")
    })

    it("should use formal greeting when formal=true", () => {
      const handler = greetCommand.handler({
        name: "Dr. Smith",
        formal: true,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Good day, Dr. Smith. 🎩")
    })
  })

  // ==========================================================================
  // LANGUAGE SUPPORT TESTS
  // ==========================================================================

  describe("Multi-language Support", () => {
    it("should greet in English", () => {
      const handler = greetCommand.handler({
        name: "Alice",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Hello Alice! 👋")
    })

    it("should greet in Korean", () => {
      const handler = greetCommand.handler({
        name: "김철수",
        formal: false,
        language: "ko",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("안녕하세요 김철수! 👋")
    })

    it("should greet in Japanese", () => {
      const handler = greetCommand.handler({
        name: "田中",
        formal: false,
        language: "ja",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("こんにちは 田中! 👋")
    })

    it("should use formal style in Korean", () => {
      const handler = greetCommand.handler({
        name: "박영희",
        formal: true,
        language: "ko",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("안녕하십니까, 박영희. 🎩")
    })

    it("should use formal style in Japanese", () => {
      const handler = greetCommand.handler({
        name: "佐藤",
        formal: true,
        language: "ja",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("おはようございます, 佐藤. 🎩")
    })
  })

  // ==========================================================================
  // COUNT PARAMETER TESTS
  // ==========================================================================

  describe("Repeat Count", () => {
    it("should greet once when count=1", () => {
      const handler = greetCommand.handler({
        name: "Once",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith("Hello Once! 👋")
    })

    it("should greet multiple times when count>1", () => {
      const handler = greetCommand.handler({
        name: "Multi",
        formal: false,
        language: "en",
        count: 3
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledTimes(3)
      expect(logSpy).toHaveBeenNthCalledWith(1, "Hello Multi! 👋")
      expect(logSpy).toHaveBeenNthCalledWith(2, "Hello Multi! 👋")
      expect(logSpy).toHaveBeenNthCalledWith(3, "Hello Multi! 👋")
    })

    it("should handle zero count gracefully", () => {
      const handler = greetCommand.handler({
        name: "Zero",
        formal: false,
        language: "en",
        count: 0
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledTimes(0)
    })
  })

  // ==========================================================================
  // INPUT VALIDATION TESTS
  // ==========================================================================

  describe("Input Validation", () => {
    it("should handle empty name gracefully", () => {
      const handler = greetCommand.handler({
        name: "",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Hello ! 👋")
    })

    it("should handle names with special characters", () => {
      const specialNames = [
        "José",
        "François",
        "Björn",
        "John-Paul",
        "Mary O'Connor"
      ]

      specialNames.forEach(name => {
        logSpy.mockClear()

        const handler = greetCommand.handler({
          name,
          formal: false,
          language: "en",
          count: 1
        })

        Effect.runSync(handler)

        expect(logSpy).toHaveBeenCalledWith(`Hello ${name}! 👋`)
      })
    })

    it("should handle very long names", () => {
      const longName = "A".repeat(100)

      const handler = greetCommand.handler({
        name: longName,
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith(`Hello ${longName}! 👋`)
    })
  })

  // ==========================================================================
  // COMBINATION TESTS
  // ==========================================================================

  describe("Parameter Combinations", () => {
    it("should handle formal + Korean + multiple count", () => {
      const handler = greetCommand.handler({
        name: "이민수",
        formal: true,
        language: "ko",
        count: 2
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledTimes(2)
      expect(logSpy).toHaveBeenNthCalledWith(1, "안녕하십니까, 이민수. 🎩")
      expect(logSpy).toHaveBeenNthCalledWith(2, "안녕하십니까, 이민수. 🎩")
    })

    it("should handle informal + Japanese + single count", () => {
      const handler = greetCommand.handler({
        name: "鈴木",
        formal: false,
        language: "ja",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("こんにちは 鈴木! 👋")
    })

    it("should handle all language variations with formal style", () => {
      const testCases = [
        { name: "English", language: "en", expected: "Good day, English. 🎩" },
        { name: "한국어", language: "ko", expected: "안녕하십니까, 한국어. 🎩" },
        { name: "日本語", language: "ja", expected: "おはようございます, 日本語. 🎩" }
      ]

      testCases.forEach(testCase => {
        logSpy.mockClear()

        const handler = greetCommand.handler({
          name: testCase.name,
          formal: true,
          language: testCase.language as "en" | "ko" | "ja",
          count: 1
        })

        Effect.runSync(handler)

        expect(logSpy).toHaveBeenCalledWith(testCase.expected)
      })
    })
  })

  // ==========================================================================
  // OUTPUT FORMAT VALIDATION
  // ==========================================================================

  describe("Output Format Validation", () => {
    it("should produce consistent output format", () => {
      const testCases = [
        {
          args: { name: "Test", formal: false, language: "en" as const, count: 1 },
          pattern: /^Hello Test! 👋$/
        },
        {
          args: { name: "Test", formal: true, language: "en" as const, count: 1 },
          pattern: /^Good day, Test\. 🎩$/
        },
        {
          args: { name: "테스트", formal: false, language: "ko" as const, count: 1 },
          pattern: /^안녕하세요 테스트! 👋$/
        }
      ]

      testCases.forEach(testCase => {
        logSpy.mockClear()

        const handler = greetCommand.handler(testCase.args)
        Effect.runSync(handler)

        const calls = logSpy.mock.calls
        expect(calls[0][0]).toMatch(testCase.pattern)
      })
    })

    it("should include appropriate emoji for each style", () => {
      // Informal should have 👋
      let handler = greetCommand.handler({
        name: "Emoji",
        formal: false,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Hello Emoji! 👋")

      logSpy.mockClear()

      // Formal should have 🎩
      handler = greetCommand.handler({
        name: "Emoji",
        formal: true,
        language: "en",
        count: 1
      })

      Effect.runSync(handler)

      expect(logSpy).toHaveBeenCalledWith("Good day, Emoji. 🎩")
    })
  })
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createGreetingTestData = () => {
  return {
    names: ["Alice", "Bob", "Charlie", "김철수", "田中"],
    languages: ["en", "ko", "ja"] as const,
    styles: [true, false],
    counts: [1, 3, 5]
  }
}

const verifyGreetingOutput = (calls: any[][], expectedPattern: string, count: number) => {
  expect(calls).toHaveLength(count)
  calls.forEach(call => {
    expect(call[0]).toMatch(new RegExp(expectedPattern))
  })
}