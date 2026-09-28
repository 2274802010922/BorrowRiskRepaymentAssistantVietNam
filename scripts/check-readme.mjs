import { readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
let count = 0;
for (const name of ["README.md", "README.en.md", "docs/assets/readme/README.md"]) {
  const file = resolve(root, name),
    text = await readFile(file, "utf8");
  const links = [
    ...Array.from(text.matchAll(/\]\(([^)]+)\)/g), (m) => m[1]),
    ...Array.from(text.matchAll(/(?:href|src|srcset)="([^"]+)"/g), (m) => m[1]),
  ];
  for (const link of links) {
    if (/^(https?:|#|mailto:)/.test(link)) continue;
    await stat(resolve(dirname(file), decodeURIComponent(link.split("#")[0])));
    count++;
  }
  if (/badge.*license-MIT|100%.*coverage/i.test(text)) throw new Error("Unsupported README claim");
}
const preview = await readFile(resolve(root, "docs/assets/readme/social-preview.png"));
if (preview.readUInt32BE(16) !== 1280 || preview.readUInt32BE(20) !== 640)
  throw new Error("Social preview must be 1280 × 640");
console.log(
  `PASS: ${count} relative links/assets, both language entry points and 1280 × 640 social preview.`,
);
