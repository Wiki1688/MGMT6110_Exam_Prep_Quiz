#!/usr/bin/env bash
# Copies the shared content files into public/content/ so the app serves them.
# Usage: bash scripts/sync-content.sh [source-dir]
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-/home/claude/mgmt6110/build/content}"
DEST="$HERE/public/content"
mkdir -p "$DEST"
if [ -f "$SRC/questions.json" ]; then
  cp "$SRC/questions.json" "$DEST/questions.json"
  echo "copied $SRC/questions.json -> $DEST/questions.json"
else
  echo "no questions.json in $SRC (kept the existing public/content/questions.json)"
fi
if [ -f "$SRC/index.json" ]; then
  cp "$SRC/index.json" "$DEST/index.json"
  echo "copied index.json"
fi
# Copy any extra question files listed in index.json (e.g. questions-week10.json)
if [ -f "$DEST/index.json" ]; then
  for f in $(grep -o '"[^"]*\.json"' "$DEST/index.json" | tr -d '"'); do
    [ -f "$SRC/$f" ] && cp "$SRC/$f" "$DEST/$f" && echo "copied $f" || true
  done
fi
