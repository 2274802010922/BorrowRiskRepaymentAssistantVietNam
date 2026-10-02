import { beforeEach, it, expect, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { createHash } from "node:crypto";
const state = vi.hoisted(() => ({ connection: { getAccountInfo: vi.fn() }, hash: "" }));
vi.mock("../../src/solana/network/rpc", () => ({ devnetConnection: async () => state.connection }));
vi.mock("../../src/core/liquidation/manifest", () => ({
  liquidationManifest: {
    verified: true,
    program: "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
    programData: "9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA",
    upgradeSlot: "123",
    get executableSha256() {
      return state.hash;
    },
  },
}));
import { requireLiquidationProgram } from "../../src/solana/adapters/kamino-liquidation";
const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111"),
  binary = Buffer.from("controlled-test-bytecode");
function program() {
  const data = Buffer.alloc(36);
  data.writeUInt32LE(2);
  new PublicKey("9uSbGW1y9H5Av6H5TKxQ1wnFApSq2t3oEpfF2YfjDQGA").toBuffer().copy(data, 4);
  return { data, executable: true, owner: loader };
}
function header(slot = 123n) {
  const data = Buffer.alloc(45);
  data.writeUInt32LE(3);
  data.writeBigUInt64LE(slot, 4);
  return { data, owner: loader };
}
beforeEach(() => {
  state.connection = { getAccountInfo: vi.fn() };
  state.hash = createHash("sha256").update(binary).digest("hex");
});
it("hashes cold executable bytes and still checks metadata on each warm call", async () => {
  const meta = header();
  state.connection.getAccountInfo
    .mockResolvedValueOnce(program())
    .mockResolvedValueOnce(meta)
    .mockResolvedValueOnce({ ...meta, data: Buffer.concat([meta.data, binary]) });
  expect(await requireLiquidationProgram()).toBe(state.hash);
  state.connection.getAccountInfo.mockResolvedValueOnce(program()).mockResolvedValueOnce(meta);
  expect(await requireLiquidationProgram()).toBe(state.hash);
  expect(state.connection.getAccountInfo).toHaveBeenCalledTimes(5);
  state.connection.getAccountInfo
    .mockResolvedValueOnce(program())
    .mockResolvedValueOnce(header(124n));
  await expect(requireLiquidationProgram()).rejects.toThrow("LIQUIDATION_PROGRAM_CHANGED");
});
it("rejects bytecode mismatch, wrong ownership and truncated account headers", async () => {
  const meta = header();
  state.connection.getAccountInfo
    .mockResolvedValueOnce(program())
    .mockResolvedValueOnce(meta)
    .mockResolvedValueOnce({ ...meta, data: Buffer.concat([meta.data, Buffer.from("wrong")]) });
  await expect(requireLiquidationProgram()).rejects.toThrow("LIQUIDATION_PROGRAM_CHANGED");
  state.connection.getAccountInfo.mockResolvedValueOnce({
    ...program(),
    owner: new PublicKey("11111111111111111111111111111111"),
  });
  await expect(requireLiquidationProgram()).rejects.toThrow("LIQUIDATION_PROGRAM_CHANGED");
  state.connection.getAccountInfo.mockResolvedValueOnce({ ...program(), data: Buffer.alloc(1) });
  await expect(requireLiquidationProgram()).rejects.toThrow("LIQUIDATION_PROGRAM_CHANGED");
});
