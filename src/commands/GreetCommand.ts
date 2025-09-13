/**
 * Greet Command - 새로운 커맨드 추가 테스트
 * 
 * 문제 해결 후 실제 커맨드 추가가 잘 되는지 검증
 */

import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

// Arguments
const nameArg = Args.text({ name: "name" }).pipe(
  Args.withDescription("Name to greet")
)

// Options
const formalOption = Options.boolean("formal").pipe(
  Options.withDescription("Use formal greeting"),
  Options.withAlias("f")
)

const languageOption = Options.choice("language", ["en", "ko", "ja"]).pipe(
  Options.withDescription("Greeting language"),
  Options.withDefault("en")
)

const countOption = Options.integer("count").pipe(
  Options.withDescription("Number of times to greet"),
  Options.withDefault(1)
)

export const greetCommand = Command.make("greet", {
  name: nameArg,
  formal: formalOption,
  language: languageOption,
  count: countOption
}).pipe(
  Command.withDescription("Greet someone with customizable options"),
  Command.withHandler(({ name, formal, language, count }) =>
    Effect.gen(function*() {
      // 인사말 생성
      const getGreeting = (lang: string, isFormal: boolean): string => {
        if (lang === "ko") {
          return isFormal ? "안녕하십니까" : "안녕하세요"
        } else if (lang === "ja") {
          return isFormal ? "おはようございます" : "こんにちは"
        } else {
          return isFormal ? "Good day" : "Hello"
        }
      }

      const getEmoji = (isFormal: boolean): string => {
        return isFormal ? "🎩" : "👋"
      }

      const greeting = getGreeting(language, formal)
      const emoji = getEmoji(formal)

      // 지정된 횟수만큼 인사
      for (let i = 0; i < count; i++) {
        if (formal) {
          yield* Console.log(`${greeting}, ${name}. ${emoji}`)
        } else {
          yield* Console.log(`${greeting} ${name}! ${emoji}`)
        }
      }
    })
  )
)