#!/bin/bash

alias load='source ./load.sh'

chmod +x ./src/commands/*.ts

# Deno typescript commands
alias lll='./src/commands/login.ts'
alias stream='bash src/commands/streamTest.sh'

echo "Alias are:"
echo " - lll : login"
echo " - stream : login"
