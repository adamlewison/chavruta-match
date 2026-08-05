#!/usr/bin/env node
// Enforces the structural rules in ARCHITECTURE.md that lint/tsc can't express.
// Violations already known at the time this check was introduced are tracked in
// .architecture-baseline.json so the check lands green; new violations fail immediately.
// The baseline should only ever shrink — see ARCHITECTURE.md's remediation plan.

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE_PATH = join(ROOT, ".architecture-baseline.json");

const SCAN_DIRS = ["app", "components", "lib", "drizzle", "types", "data"];
const IGNORE_DIR_NAMES = new Set(["node_modules", ".next", "meta"]);

/** @type {{rule: string, file: string}[]} */
const violations = [];

function addViolation(rule, absPath, detail) {
  violations.push({
    rule,
    file: relative(ROOT, absPath).replace(/\\/g, "/"),
    detail,
  });
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIR_NAMES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

let allFiles = [];
for (const dir of SCAN_DIRS) {
  try {
    allFiles = allFiles.concat(walk(join(ROOT, dir)));
  } catch {
    // directory doesn't exist yet — fine
  }
}

const sourceFiles = allFiles.filter((f) => /\.(ts|tsx)$/.test(f));

// --- Rule: db-client-construction ---
// Only lib/db/index.ts may import the postgres driver / drizzle postgres-js adapter.
const DB_CLIENT_ALLOWED = join(ROOT, "lib/db/index.ts");
for (const file of sourceFiles) {
  if (file === DB_CLIENT_ALLOWED) continue;
  const content = readFileSync(file, "utf8");
  if (
    /from\s+["']postgres["']/.test(content) ||
    /from\s+["']drizzle-orm\/postgres-js["']/.test(content)
  ) {
    addViolation(
      "db-client-construction",
      file,
      "constructs its own DB client instead of importing from lib/db",
    );
  }
}

// --- Rule: client-server-boundary ---
// A "use client" file must never import server-only modules.
const SERVER_ONLY_IMPORTS = ["@/lib/db", "@/lib/queries", "@/lib/auth"];
for (const file of sourceFiles) {
  if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
  const content = readFileSync(file, "utf8");
  const firstStatement = content
    .split("\n")
    .find((l) => l.trim().length > 0);
  if (!firstStatement || !/^["']use client["']/.test(firstStatement.trim()))
    continue;
  for (const spec of SERVER_ONLY_IMPORTS) {
    // Exact module match only — @/lib/db/schema (types/constants, no client) is fine.
    const escaped = spec.replace(/\//g, "\\/");
    if (new RegExp(`from\\s+["']${escaped}["']`).test(content)) {
      addViolation(
        "client-server-boundary",
        file,
        `"use client" file imports server-only module ${spec}`,
      );
    }
  }
}

// --- Rule: deep-relative-import ---
for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  if (/from\s+["'](\.\.\/){3,}/.test(content)) {
    addViolation("deep-relative-import", file, "uses ../../../ style import");
  }
}

// --- Rule: barrel-file ---
for (const file of sourceFiles) {
  if (file === DB_CLIENT_ALLOWED) continue;
  if (basename(file) === "index.ts" || basename(file) === "index.tsx") {
    addViolation("barrel-file", file, "barrel file outside lib/db");
  }
}

// --- Rule: bad-filename ---
for (const file of allFiles) {
  const name = basename(file);
  if (/\s/.test(name) || /\(\d+\)/.test(name) || /\bcopy\b/i.test(name)) {
    addViolation("bad-filename", file, "looks like a duplicate-download artifact");
  }
}

// --- Rule: naming-case (kebab-case) ---
// Dynamic route segments ([id], [...slug]) become JS identifiers (params.id) — camelCase
// is correct there, not a violation. Only their surrounding brackets are stripped for
// route groups and private folders, which are still checked as normal path words.
function stripRouteSyntax(name) {
  if (/^\[.+\]$/.test(name)) return { value: "", dynamic: true };
  return {
    value: name.replace(/^\(([^)]+)\)$/, "$1").replace(/^_/, ""),
    dynamic: false,
  };
}
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const file of sourceFiles) {
  const rel = relative(ROOT, file);
  const parts = rel.split("/");
  for (const part of parts) {
    const withoutExt = part.replace(/\.(tsx?|d\.ts)$/, "");
    const { value: stripped, dynamic } = stripRouteSyntax(withoutExt);
    if (dynamic || stripped.length === 0) continue;
    if (!KEBAB_RE.test(stripped)) {
      addViolation("naming-case", file, `"${part}" is not kebab-case`);
      break;
    }
  }
}

// --- Rule: stray-asset-in-source-tree ---
const ALLOWED_EXT = new Set([".ts", ".tsx", ".css", ".md", ".json"]);
const ALLOWED_EXACT = new Set(["favicon.ico"]);
for (const dir of ["app", "components", "lib", "types"]) {
  let files;
  try {
    files = walk(join(ROOT, dir));
  } catch {
    continue;
  }
  for (const file of files) {
    const name = basename(file);
    if (ALLOWED_EXACT.has(name)) continue;
    if (!ALLOWED_EXT.has(extname(file))) {
      addViolation("stray-asset-in-source-tree", file, "non-source file in source tree");
    }
  }
}

// --- Rule: size-budget ---
const EXEMPT = new Set([join(ROOT, "lib/db/schema.ts")]);
for (const file of sourceFiles) {
  if (EXEMPT.has(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n").length;
  const limit = file.endsWith(".tsx") ? 500 : 400;
  if (lines > limit) {
    addViolation("size-budget", file, `${lines} lines exceeds ${limit}-line hard limit`);
  }
}

// --- Compare against baseline ---
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

if (newViolations.length > 0) {
  console.error("Architecture check failed — new violations:\n");
  for (const v of newViolations) {
    console.error(`  ${v.file}: [${v.rule}] ${v.detail}`);
  }
  console.error(
    `\n${newViolations.length} new violation(s). See ARCHITECTURE.md for the rule, ` +
      `or record a deliberate exception there and in the baseline.`,
  );
  process.exit(1);
}

if (staleBaselineEntries.length > 0) {
  console.log(
    `Note: ${staleBaselineEntries.length} baseline entr${staleBaselineEntries.length === 1 ? "y" : "ies"} ` +
      `no longer violate — remove from .architecture-baseline.json to shrink it:`,
  );
  for (const b of staleBaselineEntries) {
    console.log(`  ${b.file}: [${b.rule}]`);
  }
}

console.log(
  `Architecture check passed (${violations.length} tracked baseline violation(s), 0 new).`,
);
