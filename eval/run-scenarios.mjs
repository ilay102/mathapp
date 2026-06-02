import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:54220";
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "scenarios.json"), "utf8"));

for (const c of cases) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/check-work`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ problem: c.problem, studentLines: c.studentLines }),
  });
  const j = await r.json();
  const ms = Date.now() - t0;
  const x = j.result || {};
  console.log(JSON.stringify({
    id: c.id, ms,
    status: x.status, err: x.firstErrorLineIndex, conf: x.confidence, type: x.errorType,
    l1: x.hints?.l1, l2: x.hints?.l2, l3: x.hints?.l3,
  }));
}
