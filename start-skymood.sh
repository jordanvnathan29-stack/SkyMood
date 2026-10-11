#!/bin/bash
cd "$(dirname "$0")"

if ! lsof -nP -iTCP:5555 -sTCP:LISTEN >/dev/null 2>&1; then
  java -cp ".:json.jar" Server &
  for i in {1..30}; do
    lsof -nP -iTCP:5555 -sTCP:LISTEN >/dev/null 2>&1 && break
    sleep 1
  done
fi

npm run dev
