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
import parseArgs from '../lib/args.ts'


const main = async () => {
    const args = parseArgs([], ['environment', 'env', 'register', 'help'])

    if (args.errors.length) {
        console.log(args.error.join('\n'))
    } else {
        if (args.switches.help) {
            showHelp()
            return
        }

        // If no environment is specified, try to read from config file
        if (args.switches.register) {
            console.log('Registering new environment...')
            
            return
        }

        // Log into the predefined environment
        if (args.switches.environment) {
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
            return
        }

        console.log(`No environment specified. Try \`ml login --help\``)
        console.log(args)
    }
}

main()

function showHelp() {
    console.log(`
    Usage: ml login [options]

    Options:
      --environment, -e  The name of the environment to login to
      --register, -n     Register new environment providing details
      --help, -h         Show this help message
    `)
}
