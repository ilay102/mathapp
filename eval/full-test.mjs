#!/usr/bin/env node
// Full pipeline test: question screenshot → OCR question; handwritten answer → OCR answer; grade.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.EVAL_BASE || "http://localhost:3010";

// Each test case = a question PNG + an answer PNG + expected verdict.
const cases = [
  { q: "q1.png", a: "a1.png",  expect: "correct", label: "Q1 chain rule (correct)" },
  { q: "q1.png", a: "a2.png",  expect: "wrong",   label: "Q1 chain rule (missing)" },
  { q: "q2.png", a: "a3.png",  expect: "correct", label: "Q2 quadratic (correct)" },
  { q: "q2.png", a: "a4.png",  expect: "wrong",   label: "Q2 quadratic (wrong factor)" },
  { q: "q3.png", a: "a5.png",  expect: "correct", label: "Q3 integral (correct)" },
  { q: "q3.png", a: "a6.png",  expect: "wrong",   label: "Q3 integral (differentiated)" },
  { q: "q4.png", a: "a7.png",  expect: "correct", label: "Q4 L'Hopital (correct)" },
  { q: "q4.png", a: "a8.png",  expect: "wrong",   label: "Q4 limit (forgot rule)" },
  { q: "q5.png", a: "a9.png",  expect: "correct", label: "Q5 product rule (correct)" },
  { q: "q5.png", a: "a10.png", expect: "wrong",   label: "Q5 product rule (incomplete)" },
  { q: "q6.png", a: "a11.png", expect: "correct", label: "Q6 diff-eq (correct)" },
  { q: "q6.png", a: "a12.png", expect: "wrong",   label: "Q6 diff-eq (integration error)" },
  { q: "q7.png", a: "a13.png", expect: "correct", label: "Q7 quotient+chain (correct)" },
  { q: "q7.png", a: "a14.png", expect: "wrong",   label: "Q7 quotient+chain (missing)" },
  { q: "q8.png", a: "a15.png", expect: "correct", label: "Q8 determinant (correct)" },
  { q: "q8.png", a: "a16.png", expect: "wrong",   label: "Q8 determinant (sign)" },
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
for (const c of cases) {
  process.stdout.write(`\n[${c.label}]\n`);
  const qPng = path.join(__dirname, "images/questions", c.q);
  const aPng = path.join(__dirname, "images/answers",   c.a);

  const qOcr = await ocr(qPng, "problem");
  if (!qOcr.ok) { console.log(`  Q-OCR FAIL: ${qOcr.error}`); fail++; continue; }
  const problem = qOcr.lines.join(" ").replace(/^\d+\.\s*/, "");
  console.log(`  Q: "${problem}"`);

  const aOcr = await ocr(aPng);
  if (!aOcr.ok) { console.log(`  A-OCR FAIL: ${aOcr.error}`); fail++; continue; }
  console.log(`  A:`); aOcr.lines.forEach((l, i) => console.log(`     [${i}] ${l}`));

  const grade = await fetch(`${BASE}/api/check-work`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem, studentLines: aOcr.lines }),
  }).then((r) => r.json());

  if (!grade.ok) { console.log(`  GRADE FAIL: ${grade.error}`); fail++; continue; }
  const r = grade.result;
  const ok = r.status === c.expect;
  console.log(`  → ${r.status}${r.errors?.length ? ` (${r.errors.length} errors)` : ""} ${ok ? "✓" : `✗ expected ${c.expect}`}`);
  ok ? pass++ : fail++;
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Result: ${pass}/${pass + fail} passed (${Math.round(pass / (pass + fail) * 100)}%)`);
process.exit(fail > 0 ? 1 : 0);
