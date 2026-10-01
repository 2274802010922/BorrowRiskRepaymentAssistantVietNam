import {
  getAllOracleAccounts,
  getTokenOracleData,
  isNotNullPubkey,
} from "@kamino-finance/klend-sdk";
import { priceUpdateV2 } from "@kamino-finance/klend-sdk/dist/@codegen/pyth_rec/accounts/priceUpdateV2.js";
import { PROGRAM_ID as PYTH_RECEIVER } from "@kamino-finance/klend-sdk/dist/@codegen/pyth_rec/programId.js";
import { normalizePyth } from "../../core/risk/oracle";
import { AppError } from "../../backend/services/http";

export async function readOracleData(
  rpc: Parameters<typeof getTokenOracleData>[0],
  entries: Parameters<typeof getTokenOracleData>[1],
) {
  const accounts = await getAllOracleAccounts(
    rpc,
    entries.map((e) => e.state),
  );
  const priced = await getTokenOracleData(rpc, entries, accounts);
  return priced.map(([entry, original]) => {
    const info = entry.state.config.tokenInfo;
    const pythOnly =
      isNotNullPubkey(info.pythConfiguration.price) &&
      !isNotNullPubkey(info.scopeConfiguration.priceFeed) &&
      !isNotNullPubkey(info.switchboardConfiguration.priceAggregator);
    if (!pythOnly) return [entry, original] as const;
    const account = accounts.get(info.pythConfiguration.price);
    if (!account || account.programAddress !== PYTH_RECEIVER) throw new AppError("ORACLE_INVALID");
    const decoded = priceUpdateV2.decode(Buffer.from(account.data[0], "base64"));
    if (decoded.verificationLevel.kind !== "Full") throw new AppError("ORACLE_INVALID");
    const message = decoded.priceMessage;
    try {
      // SDK 11.0.1 scales price but leaves confidence unscaled. Both share the same exponent.
      const normalized = normalizePyth(
        message.price.toString(),
        message.conf.toString(),
        message.exponent,
        message.emaPrice.toString(),
        info.maxTwapDivergenceBps.toNumber(),
      );
      if (!original) throw new Error("ORACLE_INVALID");
      return [
        entry,
        {
          ...original,
          price: normalized.price,
          timestamp: BigInt(message.publishTime.toString()),
          valid: true,
        },
      ] as const;
    } catch {
      throw new AppError("ORACLE_INVALID");
    }
  });
}
