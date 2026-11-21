#!/usr/bin/env bash

set -euo pipefail
# shellcheck source=.github/scripts/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

bun run plan-releases --pool "$POOL_CHECKOUT/pool" --out "$PLAN"

echo "count=$(jq 'length' "$PLAN")" >> "$GITHUB_OUTPUT"
