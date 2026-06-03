import { evaluateLines, tokenize } from "../lib/evaluator.ts";
import { dimEq } from "../lib/units.ts";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

console.log("=== Running Evaluator Tests ===");

try {
  // Test Tokenizer
  const tokens = tokenize("10 kg");
  assert(tokens.length === 2, `Expected 2 tokens, got ${tokens.length}`);
  assert(tokens[0].type === "NUMBER" && tokens[0].value === 10, "First token should be NUMBER 10");
  assert(dimEq(tokens[0].dim, [0, 1, 0, 0, 0, 0, 0]), "First token should have Mass dimension");
  console.log("✓ Tokenizer passes");

  // Test Line Evaluator - Basic assignment
  const run1 = evaluateLines([
    "m = 10 kg",
    "a = 2.5 m/s^2",
    "F = m a"
  ]);

  assert(run1.results[0].type === "success", "Line 1 should succeed");
  assert(run1.results[1].type === "success", "Line 2 should succeed");
  assert(run1.results[2].type === "success", "Line 3 should succeed");
  
  const fVal = run1.results[2].quantity.value;
  assert(Math.abs(fVal - 25) < 1e-9, `Expected F = 25, got ${fVal}`);
  console.log("✓ Basic assignments & scope chaining pass");

  // Test Implicit multiplication with math expression
  const run2 = evaluateLines([
    "r = 2 m",
    "A = 3.14159 r^2"
  ]);
  assert(run2.results[0].type === "success", "Line 1 should succeed");
  assert(run2.results[1].type === "success", "Line 2 should succeed");
  const aVal = run2.results[1].quantity.value;
  assert(Math.abs(aVal - 12.56636) < 1e-4, `Expected A ≈ 12.566, got ${aVal}`);
  console.log("✓ Implicit multiplication & powers pass");

  // Test Equations & Dimensional checking (LHS = RHS)
  const run3 = evaluateLines([
    "v = 15 m/s",
    "v_0 = 10 m/s",
    "a = 2 m/s^2",
    "t = 2.5 s",
    "v = v_0 + a t", // dimensionally consistent (LHS = RHS)
    "v = v_0 + a"    // dimensionally inconsistent (m/s vs m/s^2)
  ]);
  
  assert(run3.results[4].type === "success", "Line 5 equation should succeed");
  assert(run3.results[5].type === "error", "Line 6 should fail dimension check");
  assert(run3.results[5].error.includes("Dimensional mismatch"), "Expected dimensional mismatch error");
  console.log("✓ Equation dimensional checks pass");

  console.log("\nALL EVALUATOR TESTS PASSED!");
} catch (error) {
  console.error("FAIL:", error);
  process.exit(1);
}
