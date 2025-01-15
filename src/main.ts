import { parseArgs } from 'https://deno.land/std@0.218.0/cli/parse_args.ts'
import type { ParseOptions } from 'https://deno.land/std@0.218.0/cli/parse_args.ts'

function parseArguments(args: string[]) {
  const config: ParseOptions = {
    alias: {
      'h': 'help',
      's': 'save',
      'n': 'name',
      'c': 'color',
    },
    boolean: ['help', 'save'],
    string: ['name', 'color'],
  }

  return parseArgs(args, config)
}

function printHelp(): void {
  console.log(`Usage: greetme [OPTIONS...]`)
  console.log('\nOptional flags:')
  console.log('  -h, --help                Display this help and exit')
  console.log('  -s, --save                Save settings for future greetings')
  console.log('  -n, --name                Set your name for the greeting')
  console.log('  -c, --color               Set the color of the greeting')
}

const greetings = [
  'Hello',
  'Hi',
  'Hey',
  'Good day',
  'Good morning',
  'Good evening',
]

async function main(inputArgs: string[]): Promise<void> {
  const args = parseArguments(inputArgs)

  // If help flag enabled, print help.
  if (args.help) {
    printHelp()
    Deno.exit(0)
  }

  let name: string | null = args.name
  let color: string | null = args.color
  const save: boolean = args.save

  // Open KV key-value data store
  const kv = await Deno.openKv('/tmp/kv.db')
  // let askToSave = false;

  if (!name) {
    name = (await kv.get(['name'])).value as string
  }
  if (!color) {
    color = (await kv.get(['color'])).value as string
  }
  if (save) {
    await kv.set(['name'], name)
    await kv.set(['color'], color)
  }

  console.log(
    `%c${
      greetings[Math.floor(Math.random() * greetings.length) - 1]
    }, ${name}!`,
    `color: ${color}; font-weight: bold`,
  )
}

main(Deno.args)
