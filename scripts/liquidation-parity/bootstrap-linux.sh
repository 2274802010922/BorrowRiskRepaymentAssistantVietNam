#!/usr/bin/env bash
set -euo pipefail
# Dedicated non-production harness. No VM/native library enters the Next.js dependencies.
task_repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
task_vm_root="$task_repo_root/work/liquidation-vm"
task_node_root="$task_vm_root/runtime"
mkdir -p "$task_vm_root" "$task_node_root"
if [[ ! -x "$task_node_root/bin/node" ]]; then
  cd "$task_node_root"
  curl -fsS https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o SHASUMS256.txt
  task_archive="$(awk '$2 ~ /linux-x64.tar.xz$/ {print $2}' SHASUMS256.txt)"
  test -n "$task_archive"
  curl -fsS "https://nodejs.org/dist/latest-v24.x/$task_archive" -o "$task_archive"
  sha256sum -c SHASUMS256.txt --ignore-missing
  tar -xf "$task_archive" --strip-components=1
fi
export PATH="$task_node_root/bin:$PATH"
node -v
cat > "$task_vm_root/package.json" <<'JSON'
{"name":"picachu-liquidation-vm","private":true,"type":"module","dependencies":{"litesvm":"1.5.0","@solana/web3.js":"1.98.4","bn.js":"5.2.2"},"overrides":{"@solana/web3.js@1.98.4":{"rpc-websockets":"9.3.8"}}}
JSON
npm --prefix "$task_vm_root" install --no-audit --no-fund
