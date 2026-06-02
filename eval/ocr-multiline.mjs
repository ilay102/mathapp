#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.EVAL_BASE || "http://localhost:3010";

const cases = [
  { id: "integral-wrong",   png: "hw_integral_wrong.png",   problem: "Evaluate the integral of 3x^2 dx", expectedStatus: "wrong" },
  { id: "quadratic-correct", png: "hw_quadratic_correct.png", problem: "Solve x^2 - 5x + 6 = 0",         expectedStatus: "correct" },
  { id: "quadratic-wrong",   png: "hw_quadratic_wrong.png",   problem: "Solve x^2 - 5x + 6 = 0",         expectedStatus: "wrong" },
  { id: "diffeq-correct",    png: "hw_diffeq.png",            problem: "Solve dy/dx = y, y(0) = 1",      expectedStatus: "correct" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  process.stdout.write(`[${c.id}] OCR... `);
  const data = fs.readFileSync(path.join(__dirname, c.png));
  const fd = new FormData();
  fd.append("file", new Blob([data], { type: "image/png" }), c.png);
  const ocr = await (await fetch(`${BASE}/api/ocr`, { method: "POST", body: fd })).json();
  if (!ocr.ok) { console.log(`OCR FAIL: ${ocr.error}`); fail++; continue; }
  process.stdout.write(`${ocr.provider} → ${JSON.stringify(ocr.lines)}\n   check... `);
  const ck = await (await fetch(`${BASE}/api/check-work`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem: c.problem, studentLines: ocr.lines }),
  })).json();
  if (!ck.ok) { console.log(`CHECK FAIL: ${ck.error}`); fail++; continue; }
  const got = ck.result.status;
  const ok = got === c.expectedStatus;
  console.log(`status=${got} ${ok ? "✓" : `✗ (expected ${c.expectedStatus})`}  err=${ck.result.firstErrorLineIndex}  hint="${ck.result.hints?.l1 ?? ""}"`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail > 0 ? 1 : 0);
