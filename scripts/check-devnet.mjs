import { assertDevnetGenesis, KAMINO_PROGRAM_ID } from "../src/solana/network/constants.mjs";

const endpoint = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

async function rpc(method, params = []) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const data = await response.json();
  if (data.error || !("result" in data))
    throw new Error("RPC returned an error or invalid response.");
  return data.result;
}

try {
  const genesis = await rpc("getGenesisHash");
  assertDevnetGenesis(genesis);
  const account = await rpc("getAccountInfo", [
    KAMINO_PROGRAM_ID,
    {
      encoding: "base64",
      dataSlice: { offset: 0, length: 0 },
      commitment: "confirmed",
    },
  ]);
  if (!account.value?.executable) throw new Error("Kamino program is not executable on this RPC.");
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        cluster: "devnet",
        genesis,
        program: KAMINO_PROGRAM_ID,
        executable: true,
        slot: account.context.slot,
        scope:
          "Read-only infrastructure check. No borrow, repay, simulation or signing was tested.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Never print the endpoint or native fetch error: provider URLs may contain secrets.
  console.error(
    error instanceof Error && /^(RPC |Kamino )/.test(error.message)
      ? error.message
      : "Devnet diagnostic failed. Check RPC availability and cluster configuration.",
  );
  process.exitCode = 1;
}
