import { assertEquals } from 'https://deno.land/std@0.220.1/assert/mod.ts'
import {
  assertSpyCalls,
  spy,
} from 'https://deno.land/std@0.220.1/testing/mock.ts'
import { join } from 'https://deno.land/std@0.218.0/path/mod.ts'
import { config, scoutCli } from './mod.ts'

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
