#!/usr/bin/env -S deno run --allow-env --allow-run --allow-net

import parseArgs from '../lib/args.ts'

const args = parseArgs()

console.log(JSON.stringify(args, null, 2))