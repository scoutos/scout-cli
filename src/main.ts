#!/usr/bin/env -S deno run --allow-read --allow-write

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

function main(inputArgs: string[]) {
  const args = parseArguments(inputArgs)

  if (args.help) {
    printHelp()
    Deno.exit(0)
  }

  let name: string | null = args.name
  const color: string | null = args.color

  if (!name) {
    console.log('Please enter your name:')
    name = prompt('Name:') || 'Anonymous'
  }

  console.log(
    `%c${
      greetings[Math.floor(Math.random() * greetings.length) - 1]
    }, ${name}!`,
    `color: ${color}; font-weight: bold`,
  )
}

main(Deno.args)
