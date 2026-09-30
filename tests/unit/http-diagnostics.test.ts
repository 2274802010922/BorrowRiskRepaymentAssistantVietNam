import { afterEach, expect, it, vi } from "vitest";
import { apiError, safeErrorDiagnostics } from "../../backend/services/http";
afterEach(() => vi.restoreAllMocks());
it("extracts web3 HTTP statuses without the provider body or URL", () => {
  const result = safeErrorDiagnostics(new Error("403 Forbidden: {private-token: abc}"));
  expect(result.causeCodes).toEqual(["RPC_HTTP_403"]);
  expect(JSON.stringify(result)).not.toContain("private-token");
});
it("records HTTP/SDK numeric codes without logging context headers or credentials", () => {
  const info = safeErrorDiagnostics({
    message: "RPC failed",
    context: { __code: 8100000, statusCode: 403, headers: { authorization: "private-token" } },
  });
  expect(info.causeCodes).toEqual(["SOLANA_8100000", "RPC_HTTP_403"]);
  expect(JSON.stringify(info)).not.toContain("private-token");
});
it("finds module failures wrapped by the production loader without logging secret messages or paths", async () => {
  const leaf = Object.assign(new Error("Cannot find module private-token-123"), {
    code: "MODULE_NOT_FOUND",
  });
  const outer = new Error(
    "Failed to load external module https://rpc.test/?key=private-token-123",
    { cause: leaf },
  );
  outer.stack = "Error: private-token-123\n    at load (C:/private-token-123/chunk.js:12:34)";
  leaf.stack = "Error: private-token-123\n    at resolve (/private-token-123/loader.js:56:78)";
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await apiError(outer).json()).toMatchObject({
    error: { code: "SERVER_DEPENDENCY_ERROR" },
  });
  const printed = String(log.mock.calls[0][0]);
  expect(printed).not.toContain("private-token-123");
  expect(printed).not.toContain("rpc.test");
  expect(JSON.parse(printed).diagnostics).toMatchObject({
    causeCodes: ["MODULE_NOT_FOUND"],
    categories: ["module_load"],
    frames: ["chunk.js:12:34", "loader.js:56:78"],
  });
});
it("handles cyclic error causes without exposing arbitrary codes", () => {
  const err = {
    message: "Invalid URL https://secret.test/key",
    code: "sk-private-token",
    cause: null as unknown,
  };
  err.cause = err;
  expect(safeErrorDiagnostics(err)).toEqual({
    causeCodes: [],
    categories: ["rpc_url"],
    frames: [],
  });
});
