import { readFile, mkdir, copyFile, mkdtemp, lstat, readlink, symlink } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const base = process.cwd();
const trace = resolve(base, ".next/server/app/api/demo/route.js.nft.json");
const { files } = JSON.parse(await readFile(trace, "utf8"));
files.push("route.js");
const target = await mkdtemp(resolve(tmpdir(), "picachu-bundle-"));
let count = 0;
for (const file of files) {
  const source = resolve(dirname(trace), file);
  const path = relative(base, source);
  if (path.startsWith("..")) throw new Error("Trace escaped project");
  const dest = resolve(target, path);
  await mkdir(dirname(dest), { recursive: true });
  const info = await lstat(source);
  if (info.isSymbolicLink()) {
    const link = await readlink(source);
    const linked = resolve(dirname(source), link);
    const relativeTarget = relative(base, linked);
    if (relativeTarget.startsWith("..")) throw new Error("Symlink escaped project");
    await symlink(resolve(target, relativeTarget), dest, "junction");
  } else if (info.isDirectory()) {
    await mkdir(dest, { recursive: true });
  } else await copyFile(source, dest);
  count++;
}
const probe = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `await import('@kamino-finance/klend-sdk'); await import('@solana/kit'); console.log('SDK_IMPORT_OK');
    const {createRequire}=await import('node:module');
    process.env.KAMINO_MARKET_ID='9VaMhQPqEjQSByvZfjYFP6iiJLZFKzXTE5MNK9bDg1dr';
    process.env.KAMINO_COLLATERAL_RESERVE='5jKCbPgqtJXbWfwi5zERhSmK16jrGuXdkicYekk1maVF';
    process.env.KAMINO_DEBT_RESERVE='6DndsViDZXLSsQoq9JxCFijdr91Q3uAXoRsHRqjvxFE6';
    process.env.SOLANA_RPC_URL='https://api.devnet.solana.com';
    process.env.PLAN_BINDING_SECRET='0'.repeat(32);
    delete process.env.RATE_LIMIT_REDIS_URL; delete process.env.RATE_LIMIT_REDIS_TOKEN;
    globalThis.fetch=async()=>{throw new Error('OFFLINE_RPC_PROBE');};
    const route=createRequire(process.cwd()+'/probe.cjs')('./.next/server/app/api/demo/route.js');
    const response=await route.routeModule.userland.POST(new Request('http://localhost/api/demo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({wallet:'CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN',action:'check'})}));
    const result=await response.json(); console.log('COMPILED_CONFIGURED_ROUTE',response.status,result.error?.code);
    if(result.error?.code!=='DEVNET_UNAVAILABLE')throw new Error('COMPILED_ROUTE_IMPORT_FAILED');`,
  ],
  { cwd: target, encoding: "utf8", timeout: 60000 },
);
console.log("Copied traced deployment files:", count);
console.log(probe.stdout);
if (probe.status !== 0) {
  console.error("Import probe:", probe.error?.code ?? probe.signal ?? probe.status);
  console.error(probe.stderr);
  process.exitCode = 1;
}
console.log("Diagnostic bundle retained at:", target);
