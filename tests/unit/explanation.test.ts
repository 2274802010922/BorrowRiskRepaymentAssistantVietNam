import { afterEach, expect, it, vi } from "vitest";
import { explain } from "../../backend/ai/explain";
import { exampleSnapshot } from "../fixtures/position";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses an explicitly labelled template without model configuration", async () => {
  vi.stubEnv("AI_ENABLED", "false");
  const result = await explain({
    snapshot: exampleSnapshot(),
    constraints: {
      budgetAtomic: "100000000",
      reserveAtomic: "50000000",
      targetLtvBps: 6000,
      shockBps: 2000,
    },
    locale: "vi",
  });
  expect(result.source).toBe("template");
  expect(result.text).toContain("chưa đạt mục tiêu");
  expect(result.text).toContain("120.000000");
});

const input = {
  snapshot: exampleSnapshot(),
  constraints: {
    budgetAtomic: "100000000",
    reserveAtomic: "50000000",
    targetLtvBps: 6000,
    shockBps: 2000,
  },
  locale: "vi",
};
function configure() {
  vi.stubEnv("AI_ENABLED", "true");
  vi.stubEnv("OPENROUTER_API_KEY", "test-only-key");
  vi.stubEnv("AI_MODEL", "provider/test-model");
}
it("calls OpenRouter with strict schema and only derived facts", async () => {
  configure();
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              summary: "Phương án chỉ cải thiện một phần.",
              caution: "Kịch bản giả định, chưa gồm lãi phát sinh.",
            }),
          },
        },
      ],
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect((await explain(input)).source).toBe("model");
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
  expect(options.headers.authorization).toBe("Bearer test-only-key");
  const body = JSON.parse(options.body);
  expect(body.provider.require_parameters).toBe(true);
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.model).toBe("provider/test-model");
  expect(JSON.parse(body.messages[1].content)).not.toHaveProperty("wallet");
});
it.each([
  ["HTTP failure", () => Promise.resolve(new Response(null, { status: 429 }))],
  ["timeout", () => Promise.reject(new DOMException("Timed out", "TimeoutError"))],
  [
    "truncated",
    () =>
      Promise.resolve(
        Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }),
      ),
  ],
  [
    "invalid schema",
    () =>
      Promise.resolve(
        Response.json({
          choices: [{ finish_reason: "stop", message: { content: '{"summary":"text"}' } }],
        }),
      ),
  ],
  [
    "invented numbers",
    () =>
      Promise.resolve(
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({ summary: "Trả 999 USDC.", caution: "Kiểm tra." }),
              },
            },
          ],
        }),
      ),
  ],
])("falls back on %s", async (_name, response) => {
  configure();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(response));
  expect((await explain(input)).source).toBe("template");
});
it("does not call a provider when the OpenRouter key is absent", async () => {
  configure();
  vi.stubEnv("OPENROUTER_API_KEY", "");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await explain(input)).source).toBe("template");
  expect(fetchMock).not.toHaveBeenCalled();
});
