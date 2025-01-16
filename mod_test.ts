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

Deno.test({
  name: 'CLI - Delete API key',
  async fn() {
    // Save original config values
    const originalConfigDir = config.CONFIG_DIR

    // Create temporary test directory
    const testDir = await Deno.makeTempDir()
    config.CONFIG_DIR = testDir
    Object.defineProperty(config, 'CONFIG_FILE', {
      get: function () {
        return join(this.CONFIG_DIR, 'secrets.json')
      },
    })

    try {
      // Setup: Create a test API key file
      await Deno.writeTextFile(
        config.CONFIG_FILE,
        JSON.stringify({ apiKey: 'test-key' }, null, 2),
      )

      const consoleLogSpy = spy(console, 'log')
      try {
        await scoutCli(['--delete-apikey'])
      } catch (_error) {
        // Ignore exit calls
      }

      assertSpyCalls(consoleLogSpy, 1)
      assertEquals(
        consoleLogSpy.calls[0].args[0],
        'API key deleted successfully',
      )

      try {
        await scoutCli(['--delete-apikey'])
      } catch (_error) {
        // Ignore exit calls
      }

      assertSpyCalls(consoleLogSpy, 2)
      assertEquals(
        consoleLogSpy.calls[1].args[0],
        'No stored API key found',
      )

      // Verify the key was actually deleted from storage
      try {
        await Deno.readTextFile(config.CONFIG_FILE)
        throw new Error('API key file should not exist')
      } catch (error) {
        assertEquals(error instanceof Deno.errors.NotFound, true)
      }

      consoleLogSpy.restore()
    } finally {
      // Cleanup: Restore original config values and remove test directory
      config.CONFIG_DIR = originalConfigDir
      Object.defineProperty(config, 'CONFIG_FILE', {
        get: function () {
          return join(this.CONFIG_DIR, 'secrets.json')
        },
      })
      await Deno.remove(testDir, { recursive: true })
    }
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
