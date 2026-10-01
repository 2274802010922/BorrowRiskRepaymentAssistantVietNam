export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const KAMINO_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

export function assertDevnetGenesis(hash) {
  if (hash !== DEVNET_GENESIS_HASH) throw new Error("RPC cluster identity is not Solana Devnet.");
}
