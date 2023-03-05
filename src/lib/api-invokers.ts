/**
 * Output of MarkLogic eval is a string with a token as described
 * in https://docs.marklogic.com/guide/rest-dev/eval#id_100567
 */
const BOUNDARY = '--BOUNDARY'

const cleanEvalOutput: any = (output: String) => {
  const len = output.trim().indexOf('\r\n')
  const token = output.trim().slice(0, len)
  return output.trim().split(token).map(l => {
    return l.split('\n')
      .filter(x => x.trim())
      .slice(2)
      .join('\n')
      .trim()
  }).filter(x => x)
}

import { Options } from "./api.ts"
const conn = {
  host: 'localhost',
  port: 8000,
  user: 'admin',
  password: 'admin'
}

// Execute a curl command to POST a file to MarkLogic (for digest with deno)
// curl -u admin:admin -X POST -d@eval/foo.js --digest http://localhost:8000/v1/eval
//
export const put = async (
  path: string,
  options: Options
) => {
  const { connection = conn, src, code, format } = options
  const { host, port, user, password } = connection
  // invoke curl in deno.run wrapper with arguments:
  // curl -u admin:admin -X POST -d@eval/foo.js --digest http://localhost:8000/v1/eval
  // const filename = '../eval/mods.xqy'
  let query = ''
  if (code) {
    query = `${format}=${code}`
  } else {
    if (src) {
      // const extension = src.split('.').pop()
      // query=`${extension === 'xqy' ? 'xquery' : 'javascript'}@${src}`
      query = 'sdf'
    } else {
      return {
        error: 'No code or src specified',
        responseText: ''
      }
    }
  }

  const cmd = [
    "/usr/bin/curl",
    "--silent", "--compressed", "--show-error", "--no-styled-output",
    "-u", `${user}:${password}`, "--digest",
    // "-H", `"Content-type: multipart/mixed; boundary=${BOUNDARY}"`,
    "-X", "POST",
    "--data-urlencode", query,
    "--data", `database=Documents`,
    "--data", `modules=cup-modules`,
    `http://${host}:${port}${path}`
  ]
  // console.log('cmd is ', cmd.join(' '))
  const p = await Deno.run({ cmd, stdout: "piped" })
  const outputText = new TextDecoder().decode(await p.output())
  const responses = cleanEvalOutput(outputText)
  return {
    error: null, responses
  }
}
