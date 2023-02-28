/**
 *
 * Module for communicating with the MarkLogic REST API.
 * 
 * Example usage:
 * 
 * import { api } from 'lib/api'
 * 
 * api.v1.eval({
 *   src: 'path/to/foo.js',
 *   database: 'Documents',
 *   modules: 'Modules',
 *   variables: {
 *    foo: 'bar'
 *   }  
 * })
 * 
 */

const conn = {
    host: 'localhost',
    port: 8000,
    user: 'admin',
    password: 'admin'
}

export const api = {
    v1: {
        eval: async (options) => {
            const { 
                src, database, modules, variables,
                connection = conn
            } = options

            return await put(`/v1/eval?database=${database}&modules=${modules}`, {
                body: `var a = 100; var b = 200; var c = a + b; c;`,
                connection,
            })
        }
    },
    v2: {
        manage: {}
    }
}

// PUT method curl request wrapper
const put = async (path, options) => {
    const { 
        body, connection = conn
    } = options

    const { host, port, user, password } = connection

    const url = `http://${host}:${port}${path}`

    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', `Digest ${btoa(`${user}:${password}`)}`)

    const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
    })
    console.log(response)
    return await response.json()
}   

/*
    const { host, port, user, password } = connection
    // invoke curl in deno.run wrapper with arguments:
    // curl -u admin:admin -X POST -d@eval/foo.js --digest http://localhost:8000/v1/eval
    const p = await Deno.run({
        cmd: [
            "curl", 
            "-u", `${user}:${password}`, "--digest", 
            "-X", "POST", 
            "-d@" + src, 
            `http://${host}:${port}/v1/eval`                    
        ],
        stdout: "piped"
    });
    const outputText = new TextDecoder().decode(await p.output());
    return outputText

*/