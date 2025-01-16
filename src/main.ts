#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

import { parseArgs } from 'https://deno.land/std@0.218.0/cli/parse_args.ts'
import { join } from 'https://deno.land/std@0.218.0/path/mod.ts'
import type { ParseOptions } from 'https://deno.land/std@0.218.0/cli/parse_args.ts'

const CONFIG_DIR = join(
  Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '.',
  '.scout-cli',
)
const CONFIG_FILE = join(CONFIG_DIR, 'secrets.json')

function parseArguments(args: string[]) {
  const config: ParseOptions = {
    alias: {
      'h': 'help',
      's': 'save',
    },
    boolean: ['help', 'save', 'delete-apikey'],
    string: ['apikey', 'get-workflow'],
  }

  return parseArgs(args, config)
}

function printHelp(): void {
  console.log(`Usage: greetme [OPTIONS...]`)
  console.log('\nOptional flags:')
  console.log('  -h, --help                Display this help and exit')
  console.log('  -s, --save                Save settings for future greetings')
  console.log('  -k, --apikey              Set your API key for authentication')
  console.log('  -d, --delete-apikey       Delete your API key')
  console.log('      --get-workflow        Get workflow by ID')
}

async function getStoredApiKey(): Promise<string | null> {
  try {
    const config = await Deno.readTextFile(CONFIG_FILE)
    return JSON.parse(config).apiKey || null
  } catch {
    return null
  }
}

async function saveApiKey(apiKey: string): Promise<void> {
  try {
    // Ensure config directory exists
    await Deno.mkdir(CONFIG_DIR, { recursive: true })
    const config = { apiKey }
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to save API key:', error)
    throw error
  }
}

async function deleteApiKey(): Promise<void> {
  try {
    await Deno.remove(CONFIG_FILE)
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

async function main(inputArgs: string[]) {
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

main(Deno.args)
