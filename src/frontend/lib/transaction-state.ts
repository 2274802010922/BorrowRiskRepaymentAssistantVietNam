import type { Constraints, PositionSnapshot } from "../../shared/types";
export function previewKey(
  wallet: string | null,
  source: string,
  snapshot: PositionSnapshot | null,
  constraints: Constraints | null,
  amount?: string,
) {
  return JSON.stringify({ wallet, source, snapshot, constraints, amount });
}
export const pendingPhases = [
  "submitted",
  "confirmation_unknown",
  "confirmed",
  "verification_pending",
];
export function writeRecovery(key: string, value: unknown) {
  try {
    const encoded = JSON.stringify(value);
    localStorage.setItem(key, encoded);
    if (localStorage.getItem(key) !== encoded) throw new Error();
    window.dispatchEvent(new Event(key));
  } catch {
    throw new Error("STORAGE_UNAVAILABLE");
  }
}
