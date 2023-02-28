#!/bin/bash

alias load='source ./load.sh'

chmod +x ./src/commands/*.ts

# Deno typescript commands
alias lll='./src/commands/login.ts'
alias stream='./src/commands/stream.ts'
