#!/usr/bin/env bash
set -euo pipefail
task_repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="$task_repo_root/work/liquidation-vm/runtime/bin:$PATH"
cd "$task_repo_root"
exec node scripts/liquidation-parity/probe-vm.mjs "$@"
