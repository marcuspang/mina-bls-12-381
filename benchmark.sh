#!/bin/bash

filename=$1

if [ -z "$filename" ]; then
    echo "Usage: $0 <filename>"
    exit 1
fi

bun run src/$filename.ts > benchmark/$filename.txt
