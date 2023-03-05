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

// import { II, DD, WW } from './logging.ts'
import { put } from './api-invokers.ts'

export interface Options {
    connection?: any
    code?: string
    format?: string
    src?: string
    body?: any
    database?: string
    variables?: any
}

export const api = {
    v1: {
        eval: async (options: Options) => {
            const { error, responses } = await put(`/v1/eval`, options)
            return error || responses
        }
    },
    v2: {
        manage: {
            hosts: {},
            databases: {},
            servers: {},
            users: {},
        }
    }
}
