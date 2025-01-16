#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net

import { scoutCli } from './mod.ts'
scoutCli(Deno.args)
