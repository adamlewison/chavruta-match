#!/usr/bin/env node
// Automated PR review. Runs in CI (.github/workflows/ai-review.yml) and posts a
// single sticky comment. Advisory only — this script always exits 0 so a review
// failure can never block a merge.
//
// The model is deliberately given as little work as possible: this script picks
// the files worth reviewing, strips the diff down to a line-numbered form, and
// then throws away any finding it can't anchor to a line the PR actually added.
// One request, one cheap model, capped tokens.
//
// Run `node scripts/ai-review.mjs --dry-run` locally to print the prompt that
// would be sent without calling the API or posting anything.

import { execFileSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");

const { AI_GATEWAY_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, BASE_SHA } =
  process.env;
const HEAD_SHA = process.env.HEAD_SHA || "HEAD";

// Overridable with an `AI_REVIEW_MODEL` repository variable — swapping models is a
// settings change, not a code change. Unset variables arrive as "", not undefined.
const AI_REVIEW_MODEL = process.env.AI_REVIEW_MODEL || "google/gemini-2.5-flash-lite";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const COMMENT_MARKER = "<!-- vruta:ai-review -->";

// Budgets. These bound the worst case: a huge PR costs the same as a medium one
// because the diff is truncated before it is ever sent.
const MAX_FILES = 25;
const MAX_PROMPT_CHARS = 60_000;
const MAX_ADDED_LINES_PER_FILE = 400;
const MAX_FINDINGS = 10;
const MAX_OUTPUT_TOKENS = 1500;
const REQUEST_TIMEOUT_MS = 90_000;

// Paths whose diffs are noise to a reviewer: generated, vendored, or not code.
const SKIP_PATTERNS = [
  /^package-lock\.json$/,
  /^drizzle\/meta\//,
  /^drizzle\/.*\.sql$/,
  /^public\//,
  /^data\//,
  /^components\/ui\//, // shadcn primitives — regenerated, not hand-written
  /\.(md|json|lock|svg|png|jpe?g|gif|ico|webp|woff2?|css)$/,
];

const REVIEWABLE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;

/** Rules the model can't infer from the diff alone. Kept short on purpose — every
 *  line here is paid for on every review. */
const HOUSE_RULES = `- Only lib/db/index.ts may construct a Postgres client; everything else imports { db } from "@/lib/db".
- A "use client" file must never import @/lib/db, @/lib/queries or @/lib/auth.
- Server actions return { error: string } or { success: true, ... } for expected failures and throw only for missing session.
- Raw database errors must be translated at the action boundary, never returned to the client.
- Nothing under lib/ may import from app/ or components/.`;

const SYSTEM_PROMPT = `You are a senior TypeScript/Next.js reviewer. Report only material defects a reviewer would block on.

REPORT: logic bugs, unhandled errors or rejected promises, missing auth/ownership checks, leaked secrets or server-only data reaching the client, SQL injection or unvalidated input reaching the database, data loss, race conditions, obvious performance traps (N+1 queries, unbounded loops), and violations of the project rules below.

DO NOT REPORT: formatting, naming, import order, missing types, or anything a linter or the TypeScript compiler already catches. No style preferences, no "consider extracting", no praise, no summary of the change. Silence is the correct output for a clean diff.

Project rules:
${HOUSE_RULES}

Reply with JSON only, no prose and no markdown fences:
{"findings":[{"file":"<exact path from the diff>","line":<line number shown in the diff>,"severity":"blocker"|"warning","comment":"<one or two sentences: the defect and its consequence>"}]}

Only cite lines the diff marks with "+". If nothing qualifies, reply {"findings":[]}.`;

/** Runs a git command and returns stdout, or "" if git fails (shallow clone, bad ref). */
function git(...args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

/**
 * Splits a unified diff into per-file entries, recording which line numbers in the
 * new file are additions. That set is what later lets us reject findings pointing
 * at lines this PR never touched.
 *
 * @returns {{path: string, addedLines: Set<number>, addedCount: number, body: string}[]}
 */
function parseDiff(diffText) {
  const files = [];
  let current = null;

  for (const raw of diffText.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      if (current) files.push(current);
      current = { path: null, addedLines: new Set(), addedCount: 0, lines: [] };
      continue;
    }
    if (!current) continue;

    if (raw.startsWith("+++ ")) {
      const target = raw.slice(4).trim();
      current.path = target === "/dev/null" ? null : target.replace(/^b\//, "");
      continue;
    }
    // Binary blobs and pure metadata lines carry nothing a reviewer can read.
    if (raw.startsWith("Binary files ") || raw.startsWith("--- ")) continue;

    if (raw.startsWith("@@")) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (!match) continue;
      current.newLine = Number(match[1]);
      current.lines.push({ kind: "hunk", text: raw.split("@@")[1].trim() });
      continue;
    }
    if (current.newLine === undefined) continue;

    if (raw.startsWith("+")) {
      current.addedLines.add(current.newLine);
      current.addedCount += 1;
      current.lines.push({ kind: "add", n: current.newLine, text: raw.slice(1) });
      current.newLine += 1;
    } else if (raw.startsWith("-")) {
      current.lines.push({ kind: "del", text: raw.slice(1) });
    } else if (raw.startsWith(" ")) {
      current.lines.push({ kind: "ctx", n: current.newLine, text: raw.slice(1) });
      current.newLine += 1;
    }
  }
  if (current) files.push(current);

  return files
    .filter((f) => f.path && f.addedCount > 0)
    .map((f) => ({
      path: f.path,
      addedLines: f.addedLines,
      addedCount: f.addedCount,
      body: renderFile(f),
    }));
}

/** Renders one file's hunks with new-file line numbers, so the model can cite a
 *  line number instead of guessing one. */
function renderFile(file) {
  const out = [];
  let addedShown = 0;
  for (const line of file.lines) {
    if (line.kind === "hunk") {
      out.push(`@@ ${line.text}`);
    } else if (line.kind === "del") {
      out.push(`-      | ${line.text}`);
    } else {
      if (line.kind === "add") {
        addedShown += 1;
        if (addedShown > MAX_ADDED_LINES_PER_FILE) continue;
      }
      const marker = line.kind === "add" ? "+" : " ";
      out.push(`${marker} ${String(line.n).padStart(5)}| ${line.text}`);
    }
  }
  if (addedShown > MAX_ADDED_LINES_PER_FILE) {
    out.push(`… ${addedShown - MAX_ADDED_LINES_PER_FILE} more added lines omitted`);
  }
  return out.join("\n");
}

/** Drops generated/vendored/non-code files, then fills the prompt budget
 *  smallest-diff-first so a PR with one huge file still gets its other files reviewed. */
function selectFiles(files) {
  const reviewable = files.filter(
    (f) => REVIEWABLE_EXT.test(f.path) && !SKIP_PATTERNS.some((p) => p.test(f.path)),
  );

  const selected = [];
  let budget = MAX_PROMPT_CHARS;
  for (const file of [...reviewable].sort((a, b) => a.body.length - b.body.length)) {
    if (selected.length >= MAX_FILES || file.body.length > budget) continue;
    budget -= file.body.length;
    selected.push(file);
  }

  return { selected, omitted: reviewable.length - selected.length };
}

function buildPrompt(selected) {
  return selected.map((f) => `### ${f.path}\n${f.body}`).join("\n\n");
}

/** Calls the Vercel AI Gateway (OpenAI-compatible). Returns the raw assistant text. */
async function requestReview(prompt) {
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_REVIEW_MODEL,
      temperature: 0,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`gateway ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage ?? null,
  };
}

/**
 * Extracts the findings array from a model reply, tolerating code fences or stray
 * prose around the JSON.
 *
 * @returns the findings array, or null if the reply wasn't usable — the caller must
 *   not treat that as "nothing found", which would be a false all-clear.
 */
function parseFindings(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed.findings) ? parsed.findings : null;
  } catch {
    return null;
  }
}

/**
 * Keeps only findings that name a reviewed file, point at a line the PR added, and
 * carry a severity worth a human's attention. This is what stops a cheap model's
 * hallucinated or out-of-scope comments from ever reaching the PR.
 */
function filterFindings(findings, selected) {
  const byPath = new Map(selected.map((f) => [f.path, f]));
  const seen = new Set();
  const kept = [];

  for (const finding of findings) {
    const file = byPath.get(finding?.file);
    const line = Number(finding?.line);
    const severity = String(finding?.severity ?? "").toLowerCase();
    const comment = String(finding?.comment ?? "").trim();

    if (!file || !Number.isInteger(line) || !file.addedLines.has(line)) continue;
    if (severity !== "blocker" && severity !== "warning") continue;
    if (!comment) continue;

    const key = `${finding.file}:${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({ file: finding.file, line, severity, comment });
  }

  return kept
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "blocker" ? -1 : 1))
    .slice(0, MAX_FINDINGS);
}

function renderComment(findings, { reviewed, omitted }) {
  const scope =
    `Reviewed ${reviewed} changed file${reviewed === 1 ? "" : "s"}` +
    (omitted > 0 ? ` (${omitted} skipped — diff too large)` : "");

  const body =
    findings.length === 0
      ? "**No blocking issues found.**"
      : [
          `**${findings.length} thing${findings.length === 1 ? "" : "s"} to look at**`,
          "",
          ...findings.map((f) => {
            const icon = f.severity === "blocker" ? "🔴" : "🟡";
            return `${icon} \`${f.file}:${f.line}\` — ${f.comment}`;
          }),
        ].join("\n");

  return [
    COMMENT_MARKER,
    "### Automated review",
    "",
    body,
    "",
    "---",
    `_${scope} · advisory only, this check never blocks a merge · \`${AI_REVIEW_MODEL}\`_`,
  ].join("\n");
}

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`github ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

/** Edits this workflow's previous comment if there is one, so a PR with ten pushes
 *  ends up with one up-to-date review comment rather than ten stale ones. */
async function upsertComment(body) {
  const base = `/repos/${GITHUB_REPOSITORY}/issues`;
  const comments = await github(`${base}/${PR_NUMBER}/comments?per_page=100`);
  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

  const path = existing ? `${base}/comments/${existing.id}` : `${base}/${PR_NUMBER}/comments`;
  await github(path, { method: existing ? "PATCH" : "POST", body: JSON.stringify({ body }) });
}

async function main() {
  if (!DRY_RUN && !AI_GATEWAY_API_KEY) {
    console.log("AI_GATEWAY_API_KEY not set — skipping review.");
    return;
  }

  const range = BASE_SHA ? `${BASE_SHA}...${HEAD_SHA}` : "HEAD~1...HEAD";
  const diff = git("diff", "--unified=3", "--no-color", "--diff-filter=ACMR", range);
  if (!diff.trim()) {
    console.log(`No diff for ${range} — nothing to review.`);
    return;
  }

  const { selected, omitted } = selectFiles(parseDiff(diff));
  if (selected.length === 0) {
    console.log("No reviewable source changes — skipping review.");
    return;
  }

  const prompt = buildPrompt(selected);
  console.log(
    `Reviewing ${selected.length} file(s), ${prompt.length} prompt chars, ${omitted} omitted.`,
  );

  if (DRY_RUN) {
    console.log(`\n--- prompt ---\n${prompt}`);
    return;
  }

  const { text, usage } = await requestReview(prompt);
  if (usage) {
    console.log(`[AI-REVIEW] tokens in=${usage.prompt_tokens} out=${usage.completion_tokens}`);
  }

  const raw = parseFindings(text);
  if (raw === null) {
    // Saying "no issues found" here would be a guess dressed up as a verdict.
    console.error(`[AI-REVIEW] unusable reply, posting nothing: ${text.slice(0, 200)}`);
    return;
  }

  const findings = filterFindings(raw, selected);
  console.log(`${findings.length} finding(s) after filtering.`);

  await upsertComment(renderComment(findings, { reviewed: selected.length, omitted }));
}

// Advisory check: a broken review must never turn a green PR red.
main().catch((error) => {
  console.error(`[AI-REVIEW] skipped: ${error.message}`);
});
