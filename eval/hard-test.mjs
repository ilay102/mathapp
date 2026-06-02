#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.EVAL_BASE || "http://localhost:3010";

const cases = [
  { q: "q9.png",  a: "h1.png",  expect: "correct", label: "Q9  induction 1+...+n (correct, 5 steps)" },
  { q: "q9.png",  a: "h2.png",  expect: "wrong",   label: "Q9  induction (P(k+1) algebra slip)" },
  { q: "q10.png", a: "h3.png",  expect: "correct", label: "Q10 geometric series Σ(1/2)^n (correct)" },
  { q: "q10.png", a: "h4.png",  expect: "wrong",   label: "Q10 geometric series (arithmetic slip)" },
  { q: "q11.png", a: "h5.png",  expect: "correct", label: "Q11 matrix RREF (correct)" },
  { q: "q11.png", a: "h6.png",  expect: "wrong",   label: "Q11 matrix RREF (wrong row op)" },
  { q: "q12.png", a: "h7.png",  expect: "correct", label: "Q12 ∂/∂x of x²y+sin(xy) (correct)" },
  { q: "q12.png", a: "h8.png",  expect: "wrong",   label: "Q12 partial (missing chain factor)" },
  { q: "q13.png", a: "h9.png",  expect: "correct", label: "Q13 Pythagorean identity (unit circle)" },
  { q: "q13.png", a: "h10.png", expect: "wrong",   label: "Q13 Pythagorean identity (circular)" },
  { q: "q14.png", a: "h11.png", expect: "correct", label: "Q14 eigenvalues (correct)" },
  { q: "q14.png", a: "h12.png", expect: "wrong",   label: "Q14 eigenvalues (arithmetic 12-2≠14)" },
  { q: "q15.png", a: "h13.png", expect: "correct", label: "Q15 u-substitution (correct)" },
  { q: "q15.png", a: "h14.png", expect: "wrong",   label: "Q15 u-substitution (sign error)" },
  { q: "q16.png", a: "h15.png", expect: "correct", label: "Q16 linear system (correct)" },
  { q: "q16.png", a: "h16.png", expect: "wrong",   label: "Q16 linear system (substitution error)" },
];

async function ocr(file, mode = "answer") {
  const data = fs.readFileSync(file);
  const fd = new FormData();
  fd.append("file", new Blob([data], { type: "image/png" }), path.basename(file));
  fd.append("mode", mode);
  const res = await fetch(`${BASE}/api/ocr`, { method: "POST", body: fd });
  return await res.json();
}

let pass = 0, fail = 0;
const rows = [];
for (const c of cases) {
  process.stdout.write(`\n[${c.label}]\n`);
  const qPng = path.join(__dirname, "images/questions", c.q);
  const aPng = path.join(__dirname, "images/answers",   c.a);

  const qOcr = await ocr(qPng, "problem");
  if (!qOcr.ok) { console.log(`  Q-OCR FAIL: ${qOcr.error}`); fail++; rows.push({id:c.label, ok:false, reason:"q-ocr"}); continue; }
  const problem = qOcr.lines.join(" ").replace(/^\d+\.\s*/, "");
  console.log(`  Q: "${problem}"`);

  const aOcr = await ocr(aPng);
  if (!aOcr.ok) { console.log(`  A-OCR FAIL: ${aOcr.error}`); fail++; rows.push({id:c.label, ok:false, reason:"a-ocr"}); continue; }
  console.log(`  A:`); aOcr.lines.forEach((l, i) => console.log(`     [${i}] ${l}`));

  const grade = await fetch(`${BASE}/api/check-work`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem, studentLines: aOcr.lines }),
  }).then((r) => r.json());

  if (!grade.ok) { console.log(`  GRADE FAIL: ${grade.error}`); fail++; rows.push({id:c.label, ok:false, reason:"grade"}); continue; }
  const r = grade.result;
  const ok = r.status === c.expect;
  console.log(`  → ${r.status}${r.errors?.length ? ` (${r.errors.length} errors)` : ""} ${ok ? "✓" : `✗ expected ${c.expect}`}`);
  if (!ok && r.errors?.length) {
    r.errors.slice(0,2).forEach(e => console.log(`     · line ${e.lineIndex}: ${e.hints?.l1 ?? ""}`));
  }
  ok ? pass++ : fail++;
  rows.push({id:c.label, ok, status:r.status, expected:c.expect});
}

console.log(`\n${"=".repeat(70)}`);
console.log(`Hard set: ${pass}/${pass + fail} passed (${Math.round(pass / (pass + fail) * 100)}%)`);
console.log("\nFailures:");
rows.filter(r=>!r.ok).forEach(r => console.log(`  ✗ ${r.id} — ${r.reason ?? `got ${r.status}, expected ${r.expected}`}`));
process.exit(fail > 0 ? 1 : 0);
