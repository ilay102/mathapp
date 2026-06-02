#!/usr/bin/env node
// End-to-end test: PNG → /api/ocr → /api/check-work → expected verdict
//
// Usage:
//   node eval/ocr-e2e.mjs [--base http://localhost:3010]
//
// Reads pairs from eval/ocr-cases.json. Each case:
//   { id, png, problem, expectedStatus }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((arg, i, arr) =>
    arg.startsWith("--") ? [[arg.slice(2), arr[i + 1] ?? "true"]] : []
  ),
);
const BASE = args.base || process.env.EVAL_BASE || "http://localhost:3010";

const cases = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ocr-cases.json"), "utf8"),
);

async function uploadOcr(pngPath) {
  const data = fs.readFileSync(pngPath);
  const blob = new Blob([data], { type: "image/png" });
  const fd = new FormData();
  fd.append("file", blob, path.basename(pngPath));
  // First OCR call may take 60-120s (model download / load). Use a generous timeout.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${BASE}/api/ocr`, { method: "POST", body: fd, signal: ctrl.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function check(problem, studentLines) {
  const res = await fetch(`${BASE}/api/check-work`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem, studentLines }),
  });
  return await res.json();
}

let pass = 0, fail = 0;
for (const c of cases) {
  const pngPath = path.join(__dirname, c.png);
  process.stdout.write(`[${c.id}] OCR... `);
  const ocr = await uploadOcr(pngPath);
  if (!ocr.ok) { console.log(`OCR FAIL: ${ocr.error}`); fail++; continue; }
  process.stdout.write(`${ocr.provider} → ${JSON.stringify(ocr.lines)}  check... `);

  const result = await check(c.problem, ocr.lines);
  if (!result.ok) { console.log(`CHECK FAIL: ${result.error}`); fail++; continue; }

  const got = result.result.status;
  const ok = got === c.expectedStatus;
  console.log(`${got} ${ok ? "✓" : `✗ (expected ${c.expectedStatus})`}`);
  ok ? pass++ : fail++;
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail > 0 ? 1 : 0);
