import { test, expect } from "@playwright/test";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
for (const modified of [false, true])
  test(`demo signing ${modified ? "blocks modified message" : "submits unchanged signed message"}`, async ({
    page,
  }) => {
    const owner = Keypair.generate(),
      wallet = owner.publicKey.toBase58();
    const message = new TransactionMessage({
      payerKey: owner.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [
        SystemProgram.transfer({
          fromPubkey: owner.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();
    const transaction = Buffer.from(new VersionedTransaction(message).serialize()).toString(
      "base64",
    );
    await page.addInitScript(
      ({ wallet, modified }) => {
        localStorage.setItem("picachu-wallet-connected", "true");
        Object.defineProperty(window, "phantom", {
          value: {
            solana: {
              isPhantom: true,
              publicKey: { toBase58: () => wallet },
              connect: async () => ({ publicKey: { toBase58: () => wallet } }),
              disconnect: async () => {},
              on: () => {},
              removeListener: () => {},
              signTransaction: async (tx: {
                message: { recentBlockhash: string };
                signatures: Uint8Array[];
              }) => {
                if (modified) tx.message.recentBlockhash = "11111111111111111111111111111111";
                tx.signatures[0] = new Uint8Array(64).fill(1);
                return tx;
              },
            },
          },
        });
      },
      { wallet, modified },
    );
    let submits = 0;
    await page.route("**/api/health", (route) =>
      route.fulfill({ json: { executionConfigured: true } }),
    );
    await page.route("**/api/demo", (route) => {
      const body = route.request().postDataJSON();
      if (body.action === "check")
        return route.fulfill({
          json: {
            stage: "deposit",
            position: wallet,
            walletSol: "1000000000",
            collateralAtomic: "0",
            debtAtomic: "0",
            maxBorrowAtomic: "1000000",
            debtSymbol: "USDC",
            canWithdraw: false,
            config: { market: wallet, collateral: wallet, debt: wallet },
          },
        });
      if (body.action === "prepare")
        return route.fulfill({
          json: {
            stage: "deposit",
            amountAtomic: "100000000",
            feeLamports: "5000",
            token: "test-binding",
            transaction,
            position: wallet,
            expiresAt: Date.now() + 60000,
          },
        });
      if (body.action === "submit") {
        submits++;
        return route.fulfill({ json: { phase: "submitted", signature: "1".repeat(64) } });
      }
      return route.fulfill({ json: { phase: "verified" } });
    });
    await page.goto("/setup");
    await page.getByRole("button", { name: "Kiểm tra điều kiện", exact: true }).click();
    await page.getByRole("button", { name: "Xem trước giao dịch", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận trong ví", exact: true }).click();
    if (modified) {
      await expect(
        page.getByRole("alert").filter({ hasText: "Nội dung giao dịch khác" }),
      ).toBeVisible();
      expect(submits).toBe(0);
    } else await expect.poll(() => submits).toBe(1);
  });
