#!/usr/bin/env -S deno run --allow-env --allow-run
/**
 * @fileoverview Stream command
 * 
 * Every N seconds, eval function and print to stdout
 * 
 */

const repeat = async () => {
    const p = await Deno.run({
        cmd: ["deno", "eval", "console.log('hello')"],
        stdout: "piped"
    });

    const outputText = new TextDecoder().decode(await p.output());
    console.log(outputText);
}

setInterval(repeat, 2000)


