#!/bin/bash

typedocjson='{
  "extends": [
    "../../typedoc.base.json"
  ],
  "entryPoints": [
    "lib/index.ts"
  ]
}'

for package in packages/* engines/*; do
  tdpath="$package/typedoc.json"
  indexpath="$package/lib/index.ts"
  if [[ "$1" = "prepare" && -f "$indexpath" ]]; then
    echo "$typedocjson" > "$tdpath"
  elif [[ "$1" = "cleanup" && -f "$tdpath" ]]; then
    rm "$tdpath"
  fi
done
