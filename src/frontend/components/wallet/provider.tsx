"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { VersionedTransaction } from "@solana/web3.js";

export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey: { toBase58(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
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
  const attempt = useRef(0);
  useEffect(() => {
    let cleanup = () => {};
    let stopped = false;
    let tries = 0;
    const attach = () => {
      const p = window.phantom?.solana;
      if (!p || stopped) return;
      const changed = (key?: { toBase58(): string }) => {
        attempt.current++;
        setWallet(key?.toBase58() ?? null);
        setError(null);
      };
      const disconnected = () => {
        attempt.current++;
        setWallet(null);
      };
      p.on("accountChanged", changed);
      p.on("disconnect", disconnected);
      try {
        if (localStorage.getItem("picachu-wallet-connected") === "true") {
          const current = attempt.current;
          void p
            .connect({ onlyIfTrusted: true })
            .then(({ publicKey }) => {
              if (!stopped && current === attempt.current) setWallet(publicKey.toBase58());
            })
            .catch(() => {});
        }
      } catch {
        /* Session restoration is optional; explicit connect still works. */
      }
      cleanup = () => {
        p.removeListener("accountChanged", changed);
        p.removeListener("disconnect", disconnected);
      };
    };
    attach();
    const timer = setInterval(() => {
      if (++tries >= 20 || window.phantom?.solana) {
        clearInterval(timer);
        if (tries < 20) attach();
      }
    }, 100);
    if (window.phantom?.solana) clearInterval(timer);
    return () => {
      stopped = true;
      clearInterval(timer);
      cleanup();
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
    const current = ++attempt.current;
    try {
      const result = await p.connect();
      if (current === attempt.current) setWallet(result.publicKey.toBase58());
      try {
        localStorage.setItem("picachu-wallet-connected", "true");
      } catch {}
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? e.code : null;
      setError(
        code === 4001
          ? "WALLET_REJECTED"
          : code === -32002
            ? "WALLET_REQUEST_PENDING"
            : "WALLET_CONNECTION_FAILED",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    attempt.current++;
    setBusy(true);
    setError(null);
    try {
      await window.phantom?.solana?.disconnect();
      setWallet(null);
      try {
        localStorage.removeItem("picachu-wallet-connected");
      } catch {}
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
