import {
  type Quantity,
  type Dim,
  DIMLESS,
  dimEq,
  add,
  sub,
  mul,
  div,
  pow,
  parseUnitExpr,
  dimToString,
} from "./units";

export type Scope = Record<string, Quantity>;

export type Token =
  | { type: "NUMBER"; value: number; dim: Dim }
  | { type: "NAME"; value: string }
  | { type: "OP"; value: "+" | "-" | "*" | "/" | "^" | "·" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "EOF" };

export function tokenize(str: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^" || c === "·") {
      tokens.push({ type: "OP", value: c as any });
      i++;
      continue;
    }
    // Numbers: scientific notation, decimals
    const numMatch = /^(\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/.exec(str.slice(i));
    if (numMatch) {
      const numStr = numMatch[1];
      const nextIdx = i + numStr.length;
      
      // Lookahead for a unit expression immediately following the number (with optional spaces)
      const remaining = str.slice(nextIdx).trim();
      const unitMatch = /^([A-Za-zμΩ°][A-Za-zμΩ°·*/^\d\-²³⁻¹]*)/.exec(remaining);
      
      if (unitMatch) {
        const unitStr = unitMatch[1];
        try {
          const { factor, dim } = parseUnitExpr(unitStr);
          // Successfully parsed unit expression
          const value = parseFloat(numStr) * factor;
          tokens.push({
            type: "NUMBER",
            value: value,
            dim: dim,
          });
          const spacesMatch = /^\s*/.exec(str.slice(nextIdx));
          const spacesLen = spacesMatch ? spacesMatch[0].length : 0;
          i += numStr.length + spacesLen + unitStr.length;
          continue;
        } catch {
          // Not a valid unit expression, fall back to plain number
        }
      }
      
      tokens.push({ type: "NUMBER", value: parseFloat(numStr), dim: DIMLESS });
      i += numStr.length;
      continue;
    }
    // Names (Greek letters, variables, unit symbols like °C, μF, etc. when not attached to a number)
    const nameMatch = /^([A-Za-zμΩ°_][A-Za-z0-9μΩ°_]*)/.exec(str.slice(i));
    if (nameMatch) {
      tokens.push({ type: "NAME", value: nameMatch[1] });
      i += nameMatch[1].length;
      continue;
    }
    // Skip unrecognized
    i++;
  }
  tokens.push({ type: "EOF" });
  return tokens;
}

function resolveName(name: string, scope: Scope): Quantity {
  if (name in scope) {
    return scope[name];
  }
  // Try parsing as unit
  try {
    const parsed = parseUnitExpr(name);
    return { value: parsed.factor, dim: parsed.dim, displayUnit: name };
  } catch {
    throw new Error(`Unknown variable or unit: "${name}"`);
  }
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private scope: Scope;

  constructor(tokens: Token[], scope: Scope) {
    const cleanTokens: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const cur = tokens[i];
      cleanTokens.push(cur);
      if (i < tokens.length - 1) {
        const next = tokens[i + 1];
        // Insert implicit multiplication (*) between operands
        const isCurOperand = cur.type === "NUMBER" || cur.type === "NAME" || cur.type === "RPAREN";
        const isNextOperand = next.type === "NUMBER" || next.type === "NAME" || next.type === "LPAREN";
        if (isCurOperand && isNextOperand) {
          cleanTokens.push({ type: "OP", value: "*" });
        }
      }
    }
    this.tokens = cleanTokens;
    this.scope = scope;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: "EOF" };
  }

  private next(): Token {
    const t = this.peek();
    if (t.type !== "EOF") this.pos++;
    return t;
  }

  private consume(type: string): Token {
    const t = this.next();
    if (t.type !== type) {
      throw new Error(`Expected token of type ${type}, got ${t.type}`);
    }
    return t;
  }

  parse(): Quantity {
    const res = this.expression();
    this.consume("EOF");
    return res;
  }

  private expression(): Quantity {
    let left = this.term();
    while (true) {
      const t = this.peek();
      if (t.type === "OP" && (t.value === "+" || t.value === "-")) {
        this.next();
        const right = this.term();
        if (t.value === "+") left = add(left, right);
        else left = sub(left, right);
      } else {
        break;
      }
    }
    return left;
  }

  private term(): Quantity {
    let left = this.factor();
    while (true) {
      const t = this.peek();
      if (t.type === "OP" && (t.value === "*" || t.value === "/" || t.value === "·")) {
        this.next();
        const right = this.factor();
        if (t.value === "*") left = mul(left, right);
        else if (t.value === "·") left = mul(left, right);
        else left = div(left, right);
      } else {
        break;
      }
    }
    return left;
  }

  private factor(): Quantity {
    const t = this.peek();
    if (t.type === "OP" && (t.value === "-" || t.value === "+")) {
      this.next();
      const operand = this.factor();
      if (t.value === "-") {
        return { value: -operand.value, dim: operand.dim };
      }
      return operand;
    }
    let left = this.primary();
    const nextToken = this.peek();
    if (nextToken.type === "OP" && nextToken.value === "^") {
      this.next();
      const signToken = this.peek();
      let sign = 1;
      if (signToken.type === "OP" && (signToken.value === "-" || signToken.value === "+")) {
        this.next();
        if (signToken.value === "-") sign = -1;
      }
      const rightToken = this.next();
      if (rightToken.type !== "NUMBER") {
        throw new Error("Power exponent must be a number");
      }
      left = pow(left, sign * rightToken.value);
    }
    return left;
  }

  private primary(): Quantity {
    const t = this.next();
    if (t.type === "NUMBER") {
      return { value: t.value, dim: t.dim };
    }
    if (t.type === "NAME") {
      return resolveName(t.value, this.scope);
    }
    if (t.type === "LPAREN") {
      const val = this.expression();
      this.consume("RPAREN");
      return val;
    }
    throw new Error(`Unexpected token in expression`);
  }
}

export type EvaluationResult =
  | { type: "success"; quantity: Quantity; parsedLine: string }
  | { type: "error"; error: string; parsedLine: string }
  | { type: "empty" };

export function evaluateLines(lines: string[]): { results: EvaluationResult[]; scope: Scope } {
  const scope: Scope = {};
  const results: EvaluationResult[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      results.push({ type: "empty" });
      continue;
    }

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0 && eqIdx < trimmed.length - 1) {
      const lhsStr = trimmed.slice(0, eqIdx).trim();
      const rhsStr = trimmed.slice(eqIdx + 1).trim();

      // Check if simple assignment variable (e.g. `v`, `v_0`, `KE`)
      const isSimpleVar = /^[A-Za-z_][A-Za-z0-9_]*$/.test(lhsStr);
      if (isSimpleVar) {
        const varName = lhsStr;
        try {
          const tokens = tokenize(rhsStr);
          const parser = new Parser(tokens, scope);
          const qty = parser.parse();
          scope[varName] = qty;
          results.push({ type: "success", quantity: qty, parsedLine: line });
        } catch (e) {
          results.push({ type: "error", error: e instanceof Error ? e.message : String(e), parsedLine: line });
        }
      } else {
        // Equation check (LHS = RHS)
        try {
          const lhsTokens = tokenize(lhsStr);
          const lhsParser = new Parser(lhsTokens, scope);
          const lhsQty = lhsParser.parse();

          const rhsTokens = tokenize(rhsStr);
          const rhsParser = new Parser(rhsTokens, scope);
          const rhsQty = rhsParser.parse();

          if (!dimEq(lhsQty.dim, rhsQty.dim)) {
            throw new Error(`Dimensional mismatch: LHS is ${dimToString(lhsQty.dim)}, RHS is ${dimToString(rhsQty.dim)}`);
          }
          // Returns LHS quantity representing the dimension
          results.push({ type: "success", quantity: lhsQty, parsedLine: line });
        } catch (e) {
          results.push({ type: "error", error: e instanceof Error ? e.message : String(e), parsedLine: line });
        }
      }
    } else {
      // Just evaluate raw expression
      try {
        const tokens = tokenize(trimmed);
        const parser = new Parser(tokens, scope);
        const qty = parser.parse();
        results.push({ type: "success", quantity: qty, parsedLine: line });
      } catch (e) {
        results.push({ type: "error", error: e instanceof Error ? e.message : String(e), parsedLine: line });
      }
    }
  }

  return { results, scope };
}
