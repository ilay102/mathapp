#!/usr/bin/env node
// Test how the grader handles multi-step solutions where the error is mid-chain.
// We care about: correct firstErrorLineIndex, correctedLine, and the cascade markup
// in the UI (which depends on firstErrorLineIndex being right).

const BASE = process.env.EVAL_BASE || "http://localhost:3010";

const cases = [
  {
    id: "quadratic 3-step, wrong on line 1 (factor)",
    problem: "Solve x^2 - 7x + 12 = 0",
    studentLines: [
      "(x-2)(x-6) = 0",        // WRONG: should be (x-3)(x-4)
      "x - 2 = 0 or x - 6 = 0",
      "x = 2 or x = 6",
    ],
    expectErrorIdx: 0,
  },
  {
    id: "integration by parts 5-step, wrong on line 2 (du/dv mixed up)",
    problem: "Evaluate the integral of x*e^x dx",
    studentLines: [
      "Let u = x, dv = e^x dx",
      "du = e^x dx, v = x",         // WRONG: should be du = dx, v = e^x
      "= uv - integral v du",
      "= x e^x - integral x e^x dx",
      "stuck in a loop",
    ],
    expectErrorIdx: 1,
  },
  {
    id: "quadratic formula 4-step, wrong on line 2 (sign error in -b)",
    problem: "Solve 2x^2 + 3x - 5 = 0",
    studentLines: [
      "a=2, b=3, c=-5",
      "x = (3 ± sqrt(9 - 4*2*(-5))) / (2*2)",  // WRONG: should be -3 in numerator, not +3
      "x = (3 ± sqrt(49)) / 4",
      "x = (3 ± 7) / 4 = 5/2 or -1",
    ],
    expectErrorIdx: 1,
  },
  {
    id: "diff-eq separable 5-step, wrong on line 3 (integration error)",
    problem: "Solve dy/dx = y, y(0) = 1",
    studentLines: [
      "dy/y = dx",
      "integral dy/y = integral dx",
      "ln|y| = x^2/2 + C",          // WRONG: integral of dx is x, not x^2/2
      "y = e^(x^2/2 + C)",
      "y = e^(x^2/2)",
    ],
    expectErrorIdx: 2,
  },
  {
    id: "chain rule + product 3-step, all correct (sanity)",
    problem: "Differentiate h(x) = x^2 * sin(2x)",
    studentLines: [
      "h'(x) = 2x sin(2x) + x^2 * d/dx[sin(2x)]",
      "= 2x sin(2x) + x^2 * cos(2x) * 2",
      "= 2x sin(2x) + 2x^2 cos(2x)",
    ],
    expectErrorIdx: null,
  },
  {
    id: "limit L'Hopital 4-step, wrong on line 3 (forgot to differentiate again)",
    problem: "Evaluate lim x->0 of (1-cos(x))/x^2",
    studentLines: [
      "lim x->0 (1-cos(x))/x^2",
      "Apply L'Hopital: lim x->0 sin(x)/(2x)",
      "= sin(0) / 0 = 0 / 0",      // WRONG: should apply L'Hopital again
      "= 0",
    ],
    expectErrorIdx: 2,
  },
];

function fmt(s) { return s.replace(/\n/g, "\\n"); }

let pass = 0, fail = 0;
for (const c of cases) {
  process.stdout.write(`\n[${c.id}]\n`);
  const res = await fetch(`${BASE}/api/check-work`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem: c.problem, studentLines: c.studentLines }),
  });
  const j = await res.json();
  if (!j.ok) { console.log(`  GRADE FAIL: ${j.error}`); fail++; continue; }
  const r = j.result;
  const idxOk = r.firstErrorLineIndex === c.expectErrorIdx;
  console.log(`  status: ${r.status}  errIdx: ${r.firstErrorLineIndex} (expected ${c.expectErrorIdx}) ${idxOk ? "✓" : "✗"}`);
  if (r.firstErrorLineIndex !== null) {
    console.log(`  bad line:      ${fmt(c.studentLines[r.firstErrorLineIndex])}`);
    console.log(`  correctedLine: ${fmt(r.correctedLine ?? "(none)")}`);
    console.log(`  wrongSnippet:  ${fmt(r.wrongSnippet ?? "(whole line)")}`);
    console.log(`  hint L1:       ${r.hints?.l1 ?? ""}`);
  }
  idxOk ? pass++ : fail++;
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail > 0 ? 1 : 0);
