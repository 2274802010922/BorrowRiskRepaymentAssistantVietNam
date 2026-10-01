import { ComputeBudgetProgram, type TransactionInstruction } from "@solana/web3.js";
// Explicit Devnet fee, quoted/simulated before signing. Prevent wallet-added price
// instructions from changing the message already bound by the server.
export const DEVNET_MICRO_LAMPORTS = 1000;
export function quotedComputeBudget(ixs: TransactionInstruction[]) {
  const hasLimit = ixs.some(
    (ix) => ix.programId.equals(ComputeBudgetProgram.programId) && ix.data[0] === 2,
  );
  return [
    ...(!hasLimit ? [ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 })] : []),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: DEVNET_MICRO_LAMPORTS }),
    ...ixs.filter(
      (ix) => !(ix.programId.equals(ComputeBudgetProgram.programId) && ix.data[0] === 3),
    ),
  ];
}
