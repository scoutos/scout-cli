import { parseArgs } from 'https://deno.land/std@0.218.0/cli/parse_args.ts'
import { join } from 'https://deno.land/std@0.218.0/path/mod.ts'
import type { ParseOptions } from 'https://deno.land/std@0.218.0/cli/parse_args.ts'

export const config: {
  CONFIG_DIR: string
  CONFIG_FILE: string
} = {
  CONFIG_DIR: join(
    Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '.',
    '.scout-cli',
  ),
  get CONFIG_FILE() {
    return join(this.CONFIG_DIR, 'secrets.json')
  },
}

function parseArguments(args: string[]) {
  const parseConfig: ParseOptions = {
    alias: {
      'h': 'help',
    },
    boolean: ['help', 'delete-apikey'],
    string: ['apikey', 'get-workflow'],
  }

  return parseArgs(args, parseConfig)
}

function printHelp(): void {
  console.log('\nOptional flags:')
  console.log('  -h, --help                Display this help and exit')
  console.log('  -k, --apikey              Set your API key for authentication')
  console.log('  -d, --delete-apikey       Delete your API key')
  console.log('      --get-workflow        Get workflow by ID')
}

async function getStoredApiKey(): Promise<string | null> {
  try {
    const configData = await Deno.readTextFile(config.CONFIG_FILE)
    return JSON.parse(configData).apiKey || null
  } catch {
    return null
  }
}

async function saveApiKey(apiKey: string): Promise<void> {
  try {
    await Deno.mkdir(config.CONFIG_DIR, { recursive: true })
    // Check if secrets.json exists and is a directory
    try {
      const fileInfo = await Deno.stat(config.CONFIG_FILE)
      if (fileInfo.isDirectory) {
        // Remove the directory if it exists
        await Deno.remove(config.CONFIG_FILE, { recursive: true })
      }
    } catch {
      // If file doesn't exist, that's fine
    }
    const configData = { apiKey }
    await Deno.writeTextFile(
      config.CONFIG_FILE,
      JSON.stringify(configData, null, 2),
    )
  } catch (error) {
    console.error('Failed to save API key:', error)
    throw error
  }
}

async function deleteApiKey(): Promise<void> {
  try {
    await Deno.remove(config.CONFIG_FILE)
    console.log('API key deleted successfully')
  } catch {
    console.log('No stored API key found')
  }
}

async function getWorkflow(workflowId: string, apiKey: string): Promise<void> {
  try {
    const response = await fetch(
      `https://api-prod.scoutos.com/v2/workflows/${workflowId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const workflow = await response.json()
    console.log(JSON.stringify(workflow, null, 2))
  } catch (error) {
    console.error('Failed to fetch workflow:', error)
    Deno.exit(1)
  }
}

export async function scoutCli(inputArgs: string[]) {
  const args = parseArguments(inputArgs)

  if (args.help) {
    printHelp()
    Deno.exit(0)
  }

  // Handle API key deletion
  if (args['delete-apikey']) {
    await deleteApiKey()
    Deno.exit(0)
  }

  // Handle API key authentication
  let apiKey = args.apikey || await getStoredApiKey()
  if (!apiKey) {
    console.log('Please enter your API key:')
    apiKey = prompt('API Key:')
    if (!apiKey) {
      console.error('API key is required')
      Deno.exit(1)
    }
    await saveApiKey(apiKey)
  }

  if (args['get-workflow']) {
    await getWorkflow(args['get-workflow'], apiKey)
    Deno.exit(0)
  }

  // If no specific command was given, show help
  printHelp()
}

// Run main function if this module is being run directly
if (import.meta.main) {
  scoutCli(Deno.args)
}
