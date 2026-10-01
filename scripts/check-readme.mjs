import { readFile, stat, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
let count = 0;
async function markdownFiles(directory) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  const lists = await Promise.all(
    entries.map(async (entry) => {
      const name = `${directory}/${entry.name}`;
      return entry.isDirectory() ? markdownFiles(name) : name.endsWith(".md") ? [name] : [];
    }),
  );
  return lists.flat();
}
const documents = [
  "README.md",
  "README.en.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "THIRD_PARTY_NOTICES.md",
  "src/README.md",
  ".github/pull_request_template.md",
  ...(await markdownFiles("docs")),
];
for (const name of documents) {
  const file = resolve(root, name),
    text = await readFile(file, "utf8");
  const links = [
    ...Array.from(text.matchAll(/\]\(([^)]+)\)/g), (m) => m[1]),
    ...Array.from(text.matchAll(/(?:href|src|srcset)="([^"]+)"/g), (m) => m[1]),
  ];
  for (const link of links) {
    if (/^(https?:|#|mailto:|data:)/.test(link)) continue;
    const target = resolve(dirname(file), decodeURIComponent(link.split("#")[0]));
    try {
      await stat(target);
    } catch {
      throw new Error(`Broken link in ${name}: ${link}`);
    }
    count++;
  }
  if (/badge.*license-MIT|100%.*coverage/i.test(text)) throw new Error("Unsupported README claim");
}
const preview = await readFile(resolve(root, "docs/assets/readme/social-preview.png"));
if (preview.readUInt32BE(16) !== 1280 || preview.readUInt32BE(20) !== 640)
  throw new Error("Social preview must be 1280 × 640");
console.log(
  `PASS: ${documents.length} Markdown files, ${count} relative links/assets, both language entry points and 1280 × 640 social preview.`,
);
