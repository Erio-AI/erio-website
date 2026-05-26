#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PORT=5173
# kill anything already on that port (old server from a previous launch)
lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null

# start a local server in the background, log to /tmp
nohup python3 -m http.server $PORT > /tmp/erio-v1-server.log 2>&1 &

# give it a moment to bind, then open the browser
sleep 0.6
open "http://localhost:$PORT"
