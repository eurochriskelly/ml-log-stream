/**
 * Manages sessions based on gradle properties files at project top level
 * 
 * Properties files are used for compatibility with ml-gradle
 * 
 */
import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

export default class SessionMgr {
    topLevelDir: string;
    sessionFile: string;

    constructor(top, sessionFile) {
        this.topLevelDir = this.findTopLevelDir(top);
        this.sessionFile = sessionFile || path.join('~', '.mlsh.d', 'session.properties');
    }

    async login() {
        // check the ~/.mlsh.d directory for a session file called session.properties
        // if it exists, check if it is expired
        // if it is expired, delete it and login
        // if it is not expired, return the session name

        // properties file should contain:
        //  * session.name
        //  * session.expires
        //  * session.cookie
        //  * session.host
        //  * session.port
        //  * session.user
        //  * session.password
        //  * session.database
        //  * session.auth-method
        
        // check if session file exists
        try {
            const f = await Deno.stat('/var/tmp/a.txt').isFile
            // check if session is expired
            const props = new Properties(this.sessionFile)
            // if expired, delete session file and login
            // if not expired, return session name
          } catch(e) {
            if (e instanceof Deno.errors.NotFound) {
                // No session file.. show available environments
                // and prompt for environment to login to one of them

                // get a list of properties files in the top level directory
                // that match the pattern gradle-*.properties where * is the environment name
                const files = Deno.readDirSync(this.topLevelDir);
                const environments = []
                for (const file of files) {
                    if (file.name.match(/^gradle-.*\.properties$/)) {
                        // read the environment name from the file
                        // and add it to the list of available environments
                        environments.push(file.name)
                    }
                }
                if (environments.length) {
                    console.log('No valid session found. Please login into an environment using the `ml login --env <ENV_NAME>`.')
                    console.log('Available environments:')
                    environments.forEach(e => console.log(' ' + e))
                } else {
                    console.log('No environments found. Make sure a gradle-<ENV>.properties files exists in your project.')
                }
            }
        }
    }

    // find the top level directory by looking for the folder
    // that contains the gradle.properties file in the current directory 
    // or any of its parents
    findTopLevelDir(top) {
        let dir = top || Deno.cwd()
        let found = false;
        while (!found) {
            const files = Deno.readDirSync(dir)
            for (const file of files) {
                if (file.name === 'gradle.properties') {
                    found = true;
                    break;
                }
            }
            if (!found) {
                const parent = path.dirname(dir)
                console.log(parent)
                if (parent === dir) {
                    throw new Error('Could not find top level directory')
                }
                dir = parent
            }
        }
        return dir
    }
}

/**
 * Manages properties files.
 * 
 * Reads and writes properties files.
 * 
 */
class Properties {
    props: any;
    file: string;

    constructor(file) {
        this.file = file;
        this.props = {};
        this.load();
    }
    load() {
        const lines = Deno.readTextFileSync(this.file).split('\n');
        for (const line of lines) {
            const [key, value] = line.split('=');
            this.props[key] = value;
        }   
    }
}