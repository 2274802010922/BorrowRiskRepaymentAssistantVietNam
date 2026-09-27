"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { VersionedTransaction } from "@solana/web3.js";

export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey: { toBase58(): string } | null;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
  on(event: string, fn: (key?: { toBase58(): string }) => void): void;
  removeListener(event: string, fn: (key?: { toBase58(): string }) => void): void;
};
declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
  }
}
type WalletState = {
  wallet: string | null;
  busy: boolean;
  error: string | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  provider(): PhantomProvider | null;
};
const Context = createContext<WalletState>({
  wallet: null,
  busy: false,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  provider: () => null,
});
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const p = window.phantom?.solana;
    if (!p) return;
    const changed = (key?: { toBase58(): string }) => {
      setWallet(key?.toBase58() ?? null);
      setError(null);
    };
    const disconnected = () => setWallet(null);
    p.on("accountChanged", changed);
    p.on("disconnect", disconnected);
    return () => {
      p.removeListener("accountChanged", changed);
      p.removeListener("disconnect", disconnected);
    };
  }, []);
  async function connect() {
    if (busy) return;
    setError(null);
    const p = window.phantom?.solana;
    if (!p?.isPhantom) {
      setError("WALLET_MISSING");
      return;
    }
    setBusy(true);
    try {
      const result = await p.connect();
      setWallet(result.publicKey.toBase58());
    } catch {
      setError("WALLET_REJECTED");
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await window.phantom?.solana?.disconnect();
      setWallet(null);
    } catch {
      setError("WALLET_DISCONNECT_FAILED");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        wallet,
        busy,
        error,
        connect,
        disconnect,
        provider: () => window.phantom?.solana ?? null,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWallet = () => useContext(Context);
