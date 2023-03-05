#!/bin/bash

alias load='source ./load.sh'

chmod +x ./src/commands/*.ts

ml() {
  local command=$1
  # Ask user which command in the src/commands directory they wish to run
  # clear
  # if no command is provided, show the list of commands
  if [ -z "$command" ]; then
    echo "Which command would you like to run?"
    echo "Available commands:"
    # show a numberered list of all files in the src/commands directory
    ls -1 ./src/commands | nl
    # read the user input and store it in the variable command
    echo -n "Command: "
    read commandNumber
    # Get the command name from it's number
    # trim space from start of string variable $foo
    local command=$(ls -1 ./src/commands | nl | sed 's/^[ \t]*//' | grep "^$commandNumber" | awk '{print $2}')
    # remove the extension from the command
    command=${command%.*}
  fi
  script=./src/commands/${command}.ts
  chmod +x $script
  $script
}

# Deno typescript commands
alias reload='. ./load.sh'
alias stream='./src/commands/stream.ts'
alias sandbox='./src/commands/sandbox.ts'

echo "Run ml for a list of commands"
# cat "./load.sh" | grep "^alias" | awk '{print $2}'
