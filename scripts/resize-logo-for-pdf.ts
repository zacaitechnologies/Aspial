/**
 * One-time script to create a small logo for PDF exports.
 * Run: npx tsx scripts/resize-logo-for-pdf.ts
 * Requires: npm install -D sharp
 *
 * This keeps quotation/invoice/receipt PDFs small (~100–300 KB instead of ~17 MB)
 * when generated on the server (e.g. email attachments). Browser exports already
 * resize the logo at runtime.
 */

import * as fs from "fs";
import * as path from "path";

const sources = [
  {
    in: path.join(process.cwd(), "public/images/mainlogo.png"),
    out: path.join(process.cwd(), "public/images/mainlogo-pdf.png"),
    maxWidth: 250,
  },
  {
    in: path.join(process.cwd(), "public/images/logoPng.png"),
    out: path.join(process.cwd(), "public/images/logoPng-pdf.png"),
    maxWidth: 500,
  },
];

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error("sharp not installed; run: npm install -D sharp");
    console.error(e);
    process.exit(1);
  }
  for (const src of sources) {
    if (!fs.existsSync(src.in)) {
      console.warn("source missing, skipping:", src.in);
      continue;
    }
    await sharp(src.in).resize({ width: src.maxWidth }).toFile(src.out);
    console.log("Created", src.out, "(max width", src.maxWidth + "px)");
  }
}

main();
