import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import fs from "node:fs/promises";
const root = process.cwd(),
  dir = root + "/work/presentation/build/rendered-" + (process.env.DECK_REVISION ?? "r5");
const pdf = await PDFDocument.create();
pdf.setTitle("picachu — Chung kết UniHackFest 2026");
pdf.setAuthor("2274802010922");
for (let i = 1; i <= 12; i++) {
  const png = await pdf.embedPng(await fs.readFile(dir + `/slide-${i}.png`));
  const page = pdf.addPage([960, 540]);
  page.drawImage(png, { x: 0, y: 0, width: 960, height: 540 });
  if (i === 12) {
    const annotations = [
      [48, 151, 895, 191, "https://picachu-iota.vercel.app/portfolio"],
      [48, 94, 895, 134, "https://github.com/2274802010922/picachu__"],
    ].map(([x0, y0, x1, y1, url]) =>
      pdf.context.register(
        pdf.context.obj({
          Type: PDFName.of("Annot"),
          Subtype: PDFName.of("Link"),
          Rect: [x0, y0, x1, y1],
          Border: [0, 0, 0],
          A: { S: PDFName.of("URI"), URI: PDFString.of(url) },
        }),
      ),
    );
    page.node.set(PDFName.of("Annots"), pdf.context.obj(annotations));
  }
}
await fs.writeFile(
  root + "/work/presentation/output/" + (process.env.PDF_NAME ?? "picachu-final.pdf"),
  await pdf.save(),
);
console.log("PDF_12_PAGES");
