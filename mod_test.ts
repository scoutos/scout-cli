// deno-lint-ignore ban-ts-comment
// @ts-nocheck

// Mock console.log and prompt
const originalConsoleLog = console.log
const originalPrompt = globalThis.prompt

// Restore original console.log after all tests
Deno.test({
  name: 'Cleanup',
  fn() {
    console.log = originalConsoleLog
    globalThis.prompt = originalPrompt
  },
})
