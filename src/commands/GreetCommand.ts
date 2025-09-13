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
import { FileSystem } from "@effect/platform/FileSystem"

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
      // FileSystem 서비스 테스트
      const fs = yield* FileSystem
      
      yield* Console.log("🚀 Greet Command Started")
      
      // 인사말 생성
      const getGreeting = (lang: string, isFormal: boolean): string => {
        if (lang === "ko") {
          return isFormal ? "안녕하십니까" : "안녕하세요"
        } else if (lang === "ja") {
          return isFormal ? "こんにちは" : "やあ"
        } else {
          return isFormal ? "Good day" : "Hello"
        }
      }
      
      const greeting = getGreeting(language, formal)
      
      // 지정된 횟수만큼 인사
      for (let i = 0; i < count; i++) {
        const countSuffix = count > 1 ? ` (${i + 1}/${count})` : ""
        yield* Console.log(`${greeting}, ${name}!${countSuffix}`)
      }
      
      // 추가 정보 출력
      yield* Console.log(`\n📊 Summary:`)
      yield* Console.log(`   Name: ${name}`)
      yield* Console.log(`   Language: ${language}`)
      yield* Console.log(`   Style: ${formal ? "formal" : "casual"}`)
      yield* Console.log(`   Count: ${count}`)
      
      // FileSystem 사용 테스트 (현재 디렉토리 확인)
      try {
        const currentDir = yield* fs.readDirectory("./")
        yield* Console.log(`\n📁 Current directory has ${currentDir.length} items`)
      } catch (error) {
        yield* Console.log(`\n❌ Could not read directory: ${error}`)
      }
      
      yield* Console.log("✅ Greet Command Completed")
    })
  )
)