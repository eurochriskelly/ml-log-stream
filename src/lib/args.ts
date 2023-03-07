/**
 * Process all command line switches into a single object.
 *
 * Known flags are passted in an array called `allowed`.
 * e.g. allowed = ['help', 'version', 'file']
 *
 * Allowed flags are passed to the program preceded by '--' and followed
 * by a value. e.g. --file=foo.txt or --file foo.txt
 *
 * If an ALLOWED_FLAGS item is the only one to start with a particular
 * character, then it is accepted with that letter. For example, if 'file'
 * is in ALLOWED_FLAGS then the following are all valid:
 *   --file=foo.txt
 *   --file foo.txt
 *   -f foo.txt
 *
 * Args in the form of --arg=value are converted to { arg: value }
 * Args in the form of --arg value are converted to { arg: value }
 * Args in the form of --flag are converted to { flag: true }
 * Args in the form of --flag=false are converted to { flag: false }
 * Args in the form of --flag=true are converted to { flag: true }
 *
 * The result object has the format:
 * {
 *  error: [
 *    string,
 *    string,
 *  ],
 *  switches: {
 *    switch1: value1,
 *    switch2: value2,
 *  }
 *
 * If an arg does not exist, it is stored in a property called error.
 * All other args are stored in a property called switches.
 *
 */

interface Result {
  error: string[]
  args: any
}

const parseArgs = (
  commands: string[] = [],
  allowed: string[] = [],
) => {
  let cmdErr, command = null
  // check if first arg is a command (e.g. 'login', no '--')
  {
    const [first] = Deno.args
    if (commands.includes(first) && first !== '--') {
      command = first
    } else {
      if (commands.length && first) cmdErr = `Command [${first}] is not a valid command. Must be one of [${commands.join(', ')}]`
    }
  }
  
  // Gather all args into an array of [key, value] pairs
  const rest = command ? Deno.args.slice(1) : Deno.args
  const pairs = rest
    .map((arg, i) => {
      if (arg.includes('=')) {
        return arg.split('=')
      } else {
        if (i >= rest.length) {
          return [arg, 'last']
        } else {
          const next = rest[i + 1] || ''
          if (!next || next.startsWith('--')) {
            return [arg, true]
          } else {
            return [arg, next]
          }
        }

      }
    })
    .filter(pair => typeof pair[0] == 'string')
    .filter(x => `${x[0]}`.startsWith('--'))

  // Convert all args to a single object with the format:
  // {
  //   command: string,
  //   error: [
  //     string,
  //     string,
  //   ],
  //   args: {
  //     arg1: value1,
  //     arg2: value2,
  //   }
  // }

  const switches = pairs
    .filter(x => {
      const [k, v] = x
      const name = `${k}`.substring(2)
      return allowed.length ? allowed.includes(name) : true
    })
    .reduce((p: any, n) => {
      const [k, v] = n
      const name = `${k}`.substring(2)
      p[name] = v
      return p
    }, {})

  return {
    command,
    switches,
    length: Object.keys(switches).length,
    errors: [
      cmdErr, ...pairs
        .map(p => {
          const [k, v] = p
          const name = `${k}`.substring(2)
          if (allowed.length && !allowed.includes(name)) {
            return `Flag [${name}] is not allowed. Must be one of [${allowed.join(', ')}]`
          }
          return null
        })
    ].filter(x => x)
  }
}

export default parseArgs
