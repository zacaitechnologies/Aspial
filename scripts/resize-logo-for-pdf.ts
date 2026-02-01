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

const LOGO_PATH = path.join(process.cwd(), "public/images/mainlogo.png");
const OUT_PATH = path.join(process.cwd(), "public/images/mainlogo-pdf.png");
const MAX_WIDTH = 250;

async function main() {
  if (!fs.existsSync(LOGO_PATH)) {
    console.error("Logo not found:", LOGO_PATH);
    process.exit(1);
  }
  try {
    const sharp = (await import("sharp")).default;
    await sharp(LOGO_PATH).resize({ width: MAX_WIDTH }).toFile(OUT_PATH);
    console.log("Created", OUT_PATH, "(max width", MAX_WIDTH + "px)");
  } catch (e) {
    console.error("Install sharp first: npm install -D sharp");
    console.error(e);
    process.exit(1);
  }
}

main();
