#!/usr/bin/env bash

if [ -n "${BASH_SOURCE[0]:-}" ]; then
  SCRIPT_SOURCE="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  SCRIPT_SOURCE="${(%):-%N}"
else
  SCRIPT_SOURCE="$0"
fi

SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$PROJECT_ROOT/node-v20.19.5-darwin-arm64/bin:$PATH"
export HOME="$PROJECT_ROOT/.home"
export NPM_CONFIG_CACHE="$PROJECT_ROOT/.npm-cache"
export EXPO_NO_TELEMETRY=1

mkdir -p "$HOME" "$NPM_CONFIG_CACHE"
