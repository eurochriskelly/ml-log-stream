#!/usr/bin/env -S deno run --allow-env --allow-run --allow-net
/**
 * Login command simply tries to connect to a MarkLogic instance
 * and caches the session "cookie" in a file in the user's home directory
 * for a period of time.
 * 
 * Login command can be called directly or will be invoked if the last session
 * has expired.
 */

import { api } from '../lib/api.ts'


console.log('ok here we go')
const output = await api.v1.eval({
    src: 'eval/foo.js',
    database: 'Documents',
})

// console.log(outputText);
console.log(' ok')
