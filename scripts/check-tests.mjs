#!/usr/bin/env node
// Guards the testing standard in TESTING.md that lint/tsc can't express.
// Violations present when this check was introduced are tracked in
// .tests-baseline.json so it lands green; new violations fail immediately.
// The baseline should only ever shrink.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE_PATH = join(ROOT, ".tests-baseline.json");

/** @type {{rule: string, file: string, line?: number}[]} */
const violations = [];

function addViolation(rule, absPath, line) {
  violations.push({
    rule,
    file: relative(ROOT, absPath).replace(/\\/g, "/"),
    ...(line != null ? { line } : {}),
  });
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const testFiles = walk(ROOT);

// ─── Rule: no-focused-tests ────────────────────────────────────────────────
// .only() calls leave tests permanently skipped in CI.
for (const file of testFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\.(only)\s*\(/.test(lines[i])) {
      addViolation("no-focused-tests", file, i + 1);
    }
  }
}

// ─── Rule: no-bare-skip ────────────────────────────────────────────────────
// Skipped tests must carry an issue reference: // issue: #NNN
for (const file of testFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\.(skip)\s*\(/.test(lines[i]) && !/issue:\s*#\d+/.test(lines[i])) {
      addViolation("no-bare-skip", file, i + 1);
    }
  }
}

// ─── Rule: no-internal-mock ────────────────────────────────────────────────
// Tests must never mock the repo's own modules (relative paths or @/ aliases).
// Faking your own code asserts implementation, not behaviour.
for (const file of testFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // vi.mock("./something") or vi.mock("@/lib/something") are internal mocks.
    if (/vi\.mock\s*\(\s*["'](\.\.?\/|@\/)/.test(line)) {
      addViolation("no-internal-mock", file, i + 1);
    }
  }
}

// ─── Rule: no-sleep ────────────────────────────────────────────────────────
// Arbitrary waits make tests slow and non-deterministic. Wait on conditions
// or use fake timers instead.
for (const file of testFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\bsetTimeout\s*\(|\bsleep\s*\(/.test(lines[i])) {
      addViolation("no-sleep", file, i + 1);
    }
  }
}

// ─── Rule: no-coverage-threshold ──────────────────────────────────────────
// Coverage is a diagnostic, never a gate. No coverage threshold in vitest.config.
const vitestConfigPath = join(ROOT, "vitest.config.ts");
if (existsSync(vitestConfigPath)) {
  const content = readFileSync(vitestConfigPath, "utf8");
  if (/threshold/.test(content)) {
    addViolation("no-coverage-threshold", vitestConfigPath);
  }
}

// ─── Metrics ───────────────────────────────────────────────────────────────

function countSourceLines() {
  const SCAN_DIRS = ["app", "components", "lib"];
  let total = 0;
  for (const dir of SCAN_DIRS) {
    const fullDir = join(ROOT, dir);
    if (!existsSync(fullDir)) continue;
    const sourceFiles = walk_source(fullDir);
    for (const f of sourceFiles) {
      if (/\.(ts|tsx)$/.test(f) && !f.includes(".test.") && !f.includes(".spec.")) {
        total += readFileSync(f, "utf8").split("\n").length;
      }
    }
  }
  return total;
}

function walk_source(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk_source(full, files);
    else files.push(full);
  }
  return files;
}

let testLineCount = 0;
for (const f of testFiles) {
  testLineCount += readFileSync(f, "utf8").split("\n").length;
}
const sourceLoc = countSourceLines();
const ratio = sourceLoc > 0 ? (testLineCount / sourceLoc).toFixed(3) : "n/a";

// ─── Baseline comparison ───────────────────────────────────────────────────

let baseline = [];
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch {
  baseline = [];
}

const baselineKeys = new Set(baseline.map((b) => `${b.rule}:${b.file}`));
const violationKeys = new Set(violations.map((v) => `${v.rule}:${v.file}`));

const newViolations = violations.filter(
  (v) => !baselineKeys.has(`${v.rule}:${v.file}`),
);
const staleBaselineEntries = baseline.filter(
  (b) => !violationKeys.has(`${b.rule}:${b.file}`),
);

// ─── Report ────────────────────────────────────────────────────────────────

console.log(`\nTest suite metrics:`);
console.log(`  Test files:    ${testFiles.length}`);
console.log(`  Test LOC:      ${testLineCount}`);
console.log(`  Source LOC:    ${sourceLoc}`);
console.log(`  Test/source:   ${ratio}`);
console.log();

if (staleBaselineEntries.length > 0) {
  console.log(
    `Note: ${staleBaselineEntries.length} baseline entr${staleBaselineEntries.length === 1 ? "y" : "ies"} ` +
      `no longer violate — remove from .tests-baseline.json:`,
  );
  for (const b of staleBaselineEntries) {
    console.log(`  ${b.file}: [${b.rule}]`);
  }
  console.log();
}

if (newViolations.length > 0) {
  console.error("Test check failed — new violations:\n");
  for (const v of newViolations) {
    const loc = v.line != null ? `:${v.line}` : "";
    console.error(`  ${v.file}${loc}: [${v.rule}]`);
  }
  console.error(
    `\n${newViolations.length} new violation(s). See TESTING.md for the rule.`,
  );
  process.exit(1);
}

console.log(
  `Test check passed (${violations.length} tracked baseline violation(s), 0 new).`,
);
