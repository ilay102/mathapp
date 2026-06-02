import { parseQuantity, add, sub, mul, div, pow, format, convert, dimToString } from "../lib/units.ts";

function ok(name, fn) {
  try { const r = fn(); console.log(`✓ ${name.padEnd(45)} → ${r}`); }
  catch (e) { console.log(`✗ ${name.padEnd(45)} → ${e.message}`); }
}
function expectThrows(name, fn) {
  try { fn(); console.log(`✗ ${name.padEnd(45)} → expected throw`); }
  catch (e) { console.log(`✓ ${name.padEnd(45)} → ${e.constructor.name}: ${e.message.slice(0,55)}`); }
}

console.log("=== Basic arithmetic ===");
ok("F = m * a → Newton recognized", () => format(mul(parseQuantity("10 kg"), parseQuantity("9.81 m/s^2"))));
ok("12 in + 30 cm → m",             () => format(add(parseQuantity("12 in"), parseQuantity("30 cm")), { preferUnit: "m" }));
ok("ρ*V → kg",                       () => format(mul(parseQuantity("1000 kg/m^3"), parseQuantity("2 L"))));

console.log("\n=== Dimensional safety (Mars Orbiter would have lived) ===");
expectThrows("velocity + mass",      () => add(parseQuantity("5 m/s"), parseQuantity("10 kg")));
expectThrows("force - energy",       () => sub(parseQuantity("10 N"), parseQuantity("5 J")));
expectThrows("N*s + lb*s impulse mix", () => add(parseQuantity("4.45 N*s"), parseQuantity("1 lb*s")));

console.log("\n=== Conversion ===");
ok("100 km/h → m/s",   () => convert(100, "km/h", "m/s"));
ok("1 kWh → J",        () => convert(1, "kWh", "J"));
ok("1 atm → Pa",       () => convert(1, "atm", "Pa"));
ok("1 eV → J",         () => convert(1, "eV", "J"));
ok("1 hp → W",         () => convert(1, "hp", "W"));

console.log("\n=== Electrical (compound derivation) ===");
ok("V*I → W",          () => format(mul(parseQuantity("12 V"), parseQuantity("2 A"))));
ok("V/I → Ω",          () => format(div(parseQuantity("12 V"), parseQuantity("3 A"))));
ok("I^2*R → W",        () => format(mul(pow(parseQuantity("2 A"), 2), parseQuantity("5 Ω"))));

console.log("\n=== Electron rest energy ===");
ok("m_e c²",           () => format(mul(parseQuantity("9.109e-31 kg"), pow(parseQuantity("2.998e8 m/s"), 2)), { preferUnit: "eV" }));
