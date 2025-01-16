import { assertEquals } from 'https://deno.land/std@0.220.1/assert/mod.ts'
import {
  assertSpyCalls,
  spy,
} from 'https://deno.land/std@0.220.1/testing/mock.ts'
import { scoutCli } from './mod.ts'

// Mock console.log and prompt
const originalConsoleLog = console.log
const originalPrompt = globalThis.prompt

Deno.test({
  name: 'CLI - Help flag shows help message',
  async fn() {
    const consoleLogSpy = spy(console, 'log')
    try {
      await scoutCli(['--help'])
    } catch (_error) {
      // Ignore exit calls
    }

    assertSpyCalls(consoleLogSpy, 5) // Help message has 5 lines
    assertEquals(
      consoleLogSpy.calls[0].args[0],
      '\nOptional flags:',
    )

    // Cleanup
    consoleLogSpy.restore()
  },
})

// Restore original console.log after all tests
Deno.test({
  name: 'Cleanup',
  fn() {
    console.log = originalConsoleLog
    globalThis.prompt = originalPrompt
  },
})
