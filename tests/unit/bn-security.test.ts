import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("patched BN zero-bit masking completes without corrupting arithmetic", () => {
  // A separate process with a hard timeout catches the original synchronous hang.
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      "const BN=require('bn.js');const v=new BN('9000001').maskn(0);console.log(v.toString(10));console.log(v.div(new BN(1)).toString(10));",
    ],
    { timeout: 5000, encoding: "utf8" },
  );
  expect(output.trim()).toBe("0\n0");
});
