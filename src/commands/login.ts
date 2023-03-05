#!/usr/bin/env -S deno run --allow-env --allow-run --allow-net

/**
 * Login command simply tries to connect to a MarkLogic instance
 * and caches the session "cookie" in a file in the user's home
 * directory for a period of time.
 *
 * Login command can be called directly or will be invoked if the last session
 * has expired.
 */

import { api } from '../lib/api.ts'
import { args } from '../lib/args.ts'

console.log(`Logging in to MarkLogic...`)

const input = 'echo'
const output = await api.v1.eval({
    code: `"${input}"`,
    format: 'javascript',
    database: 'Documents',
})

if (output[0] === input) {
    console.log('Login successful. Should write out connection details to file.')
} else {
    console.log('Login failed. Should write out error details to file.')
}
