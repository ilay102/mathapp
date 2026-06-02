#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.EVAL_BASE || "http://localhost:3010";

const cases = [
  { id: "chain+quotient (correct)", png: "hard_chain_quotient.png",
    problem: "Differentiate h(x) = sin(x^2)/(x+1)", expectedStatus: "correct" },
  { id: "chain+quotient (missing parts)", png: "hard_chain_quotient_wrong.png",
    problem: "Differentiate h(x) = sin(x^2)/(x+1)", expectedStatus: "wrong" },
  { id: "integral by parts (correct)", png: "hard_integral_parts.png",
    problem: "Evaluate the integral of x*e^x dx", expectedStatus: "correct" },
  { id: "L'Hopital limit (correct)", png: "hard_lim_lhopital.png",
    problem: "Evaluate lim x->0 of sin(3x)/(2x)", expectedStatus: "correct" },
  { id: "L'Hopital limit (wrong)", png: "hard_lim_wrong.png",
    problem: "Evaluate lim x->0 of sin(3x)/(2x)", expectedStatus: "wrong" },
  { id: "telescoping sum (correct)", png: "hard_sum_telescope.png",
    problem: "Evaluate sum from k=1 to n of 1/(k(k+1))", expectedStatus: "correct" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  process.stdout.write(`[${c.id}]\n  OCR... `);
  const data = fs.readFileSync(path.join(__dirname, c.png));
  const fd = new FormData();
  fd.append("file", new Blob([data], { type: "image/png" }), c.png);
  const ocr = await (await fetch(`${BASE}/api/ocr`, { method: "POST", body: fd })).json();
  if (!ocr.ok) { console.log(`FAIL: ${ocr.error}`); fail++; continue; }
  console.log(`${ocr.provider}:`);
  ocr.lines.forEach((l, i) => console.log(`     [${i}] ${l}`));
  process.stdout.write(`  GRADE... `);
  const ck = await (await fetch(`${BASE}/api/check-work`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem: c.problem, studentLines: ocr.lines }),
  })).json();
  if (!ck.ok) { console.log(`FAIL: ${ck.error}`); fail++; continue; }
  const got = ck.result.status;
  const ok = got === c.expectedStatus;
  console.log(`${got} ${ok ? "✓" : `✗ (expected ${c.expectedStatus})`}`);
  if (ck.result.firstErrorLineIndex !== null) console.log(`     err on line ${ck.result.firstErrorLineIndex}: "${ck.result.hints?.l1 ?? ""}"`);
  ok ? pass++ : fail++;
  console.log();
}
console.log(`Result: ${pass}/${pass + fail} passed`);
process.exit(fail > 0 ? 1 : 0);
