import { it, expect, vi, afterEach } from "vitest";
import { rpcFetch, retryKitRpc } from "../../src/solana/network/fetch";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("retries typed Kit HTTP rate errors without retrying unrelated protocol errors", async () => {
  vi.useFakeTimers();
  const op = vi
    .fn()
    .mockRejectedValueOnce({ context: { statusCode: 429 } })
    .mockResolvedValue("ok");
  const result = retryKitRpc(op);
  await vi.advanceTimersByTimeAsync(1500);
  expect(await result).toBe("ok");
  expect(op).toHaveBeenCalledTimes(2);
  const failed = vi.fn().mockRejectedValue(new Error("protocol"));
  await expect(retryKitRpc(failed)).rejects.toThrow("protocol");
  expect(failed).toHaveBeenCalledOnce();
});
it("retries 429 within a bounded window and preserves the request payload", async () => {
  vi.useFakeTimers();
  const f = vi
    .fn()
    .mockResolvedValueOnce(new Response("limited", { status: 429 }))
    .mockResolvedValueOnce(new Response("limited", { status: 429 }))
    .mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", f);
  const result = rpcFetch("https://rpc.test", { method: "POST", body: "same-signed-bytes" });
  await vi.advanceTimersByTimeAsync(4500);
  expect((await result).status).toBe(200);
  expect(f).toHaveBeenCalledTimes(3);
  expect(f.mock.calls.every((c) => c[1].body === "same-signed-bytes")).toBe(true);
});
it("does not retry arbitrary network failures or non-rate-limit HTTP errors", async () => {
  const f = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));
  vi.stubGlobal("fetch", f);
  expect((await rpcFetch("https://rpc.test")).status).toBe(403);
  expect(f).toHaveBeenCalledOnce();
});
