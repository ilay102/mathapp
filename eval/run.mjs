#!/usr/bin/env node
// Eval harness for /api/check-work.
// Usage: node eval/run.mjs [--base http://localhost:3010]

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

const problems = JSON.parse(
  fs.readFileSync(path.join(__dirname, "problems.json"), "utf8"),
);

function score(expected, actual) {
  const reasons = [];
  let pass = true;
  if (expected.status && actual.status !== expected.status) {
    pass = false;
    reasons.push(`status: expected ${expected.status}, got ${actual.status}`);
  }
  if (
    expected.firstErrorLineIndex !== undefined &&
    actual.firstErrorLineIndex !== expected.firstErrorLineIndex
  ) {
    pass = false;
    reasons.push(
      `firstErrorLineIndex: expected ${expected.firstErrorLineIndex}, got ${actual.firstErrorLineIndex}`,
    );
  }
  if (expected.errorType && actual.errorType && actual.errorType !== expected.errorType) {
    reasons.push(`errorType soft-miss: expected ${expected.errorType}, got ${actual.errorType}`);
  }
  return { pass, reasons };
}

async function runOne(p) {
  const t0 = Date.now();
  let actual = null;
  let error = null;
  try {
    const res = await fetch(`${BASE}/api/check-work`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ problem: p.problem, studentLines: p.studentLines }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    actual = json.result;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const ms = Date.now() - t0;
  return { p, actual, error, ms };
}

const POOL = 3; // concurrency
const results = [];
let i = 0;
async function worker() {
  while (i < problems.length) {
    const my = i++;
    const r = await runOne(problems[my]);
    results[my] = r;
    process.stdout.write(r.error ? "E" : ".");
  }
}
await Promise.all(Array.from({ length: POOL }, worker));
process.stdout.write("\n\n");

let passed = 0;
let failed = 0;
let errored = 0;
const rows = [];
for (const r of results) {
  if (r.error) {
    errored++;
    rows.push({ id: r.p.id, verdict: "ERROR", note: r.error, ms: r.ms });
    continue;
  }
  const { pass, reasons } = score(r.p.expected, r.actual);
  if (pass) {
    passed++;
    rows.push({ id: r.p.id, verdict: "PASS", note: reasons.join("; ") || "ok", ms: r.ms });
  } else {
    failed++;
    rows.push({ id: r.p.id, verdict: "FAIL", note: reasons.join("; "), ms: r.ms });
  }
}

const total = results.length;
console.log(`Results (${total} cases)`);
console.log("-".repeat(80));
for (const r of rows) {
  console.log(`[${r.verdict.padEnd(5)}] ${r.id.padEnd(40)} ${String(r.ms).padStart(5)}ms  ${r.note}`);
}
console.log("-".repeat(80));
console.log(
  `pass ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)  fail ${failed}  err ${errored}`,
);

const outPath = path.join(__dirname, "last-run.json");
fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), base: BASE, rows, results }, null, 2));
console.log(`\nwrote ${outPath}`);

process.exit(failed + errored > 0 ? 1 : 0);
