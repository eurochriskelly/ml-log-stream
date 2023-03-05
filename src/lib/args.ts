/**
 * Process all command line args into a single object.
 *
 * Known flags are stored in array ALLOWED_FLAGS.
 * e.g. ALLOWED_FLAGS = ['help', 'version', 'file']
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
 *  args: {
 *    arg1: value1,
 *    arg2: value2,
 *  }
 *
 * If an arg does not exist, it is stored in a property called error.
 * All other args are stored in a property called args.
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

  //  pairs.forEach(p => console.log(p))

  return {
    command,
    args: pairs
      .filter(x => {
        const [k, v] = x
        const name = `${k}`.substring(2)
        return allowed.length ? allowed.includes(name) : true
      })
      .reduce((p: any, n) => {
        const [k, v] = n
        p[`${k}`] = v
        return p
      }, {}),
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






//export default parseArgs()