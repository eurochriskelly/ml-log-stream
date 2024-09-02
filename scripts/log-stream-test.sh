#!/bin/bash

cd src
echo "Executing streamer for env $ML_ENV"

source ~/.mlshrc

if [ ! -n "$MLSH_CMD" ]; then
    echo "Please set MLSH_CMD in your ~/.mlshrc file."
    exit
fi

if [ ! -f logStreamer.sjs ]; then
    echo "Please run 'npm run build' to build the logStreamer.js file."
    exit
fi

if [ -z "$1" ]; then
    echo "Please specify a log type [error|access]"
    exit
fi

VARS="FLAGS:no-eval+no-moz+no-saf+no-chrome"
VARS="$VARS,FORMAT:json"
VARS="$VARS,LOG_PATH:/var/opt/MarkLogic/Logs"
VARS="$VARS,FOLLOW:true"
VARS="$VARS,TYPE:$1"
VARS="$VARS,VERBOSE:false"
VARS="$VARS,USAGE:false"

if [ ! -f /tmp/ml-error-log-filters.txt ];then
    echo "No filter file found [/tmp/ml-error-log-filters.txt]"
fi

if [ ! -f /tmp/ml-cluster-logs.$1 ];then
    touch /tmp/ml-cluster-logs.$1
fi

FILTER_OUT=
while true;do
    if [ -f /tmp/ml-error-log-filters.txt ];then
        FILTER_OUT="$(cat /tmp/ml-error-log-filters.txt)"
    fi
    res=$($MLSH_CMD eval \
        -s "logStreamer.sjs" \
        -d "cup-modules" \
        -v "$VARS")
    
    echo "$res" | while read line;do
        # if the first char is [ then it's a json array. Otherwise skip it.
        if [ "${line:0:1}" != "[" ];then
            continue
        fi
        # Keep a copy
        echo "$line" >> /tmp/ml-cluster-logs.$1
        node logPrinter "$1" "$FILTER_OUT" "$line" | tee -a ml-${1}.log
    done
    sleep 5
    
done

