---
name: architecture-review
description: Run the deterministic architecture check and then review what a script can't judge — file/module naming quality, whether code sits in the conceptually right place, abstraction altitude, and drift between ARCHITECTURE.md and the actual tree. Use when asked to review architecture, audit structure, or check ARCHITECTURE.md compliance, and on the weekly scheduled architecture-review workflow.
---

# Architecture review

`ARCHITECTURE.md` is this repo's law for where code lives. `scripts/check-architecture.mjs`
enforces the part of it that's mechanically checkable. This skill runs that check, then does
the review a script fundamentally can't: judgment calls about naming quality, placement, and
abstraction level.

## Steps

1. **Run the deterministic check.**

   ```bash
   npm run architecture:check
   ```

   If it fails on a *new* violation (not already in `.architecture-baseline.json`), that's a
   hard stop — fix it or, if it's a deliberate exception, follow ARCHITECTURE.md's escape
   hatch (inline comment + entry in its "Recorded exceptions" table) rather than adding it to
   the baseline. The baseline is for pre-existing debt, not new decisions.

2. **Read `ARCHITECTURE.md` in full** before reviewing anything else — it's short by design.
   Pay particular attention to the directory tree, the decision recipes, and the anti-patterns
   list.

3. **Review what the script can't check.** For each file touched since the last review (or,
   for a full audit, across `app/`, `components/`, `lib/`, `drizzle/`):
   - **Naming quality, not just casing**: is `match-card.tsx` actually about matching cards,
     or has it grown into something a better name would describe? The check only verifies
     kebab-case; it has no opinion on whether the name is *right*.
   - **Conceptual placement**: does a file in `components/` actually get used from 2+ routes
     (per the decision recipes), or has something route-local crept into the shared folder —
     or the reverse, a shared concern hiding inside a `_components/` folder?
   - **Abstraction altitude**: has a new indirection layer appeared between entrypoint → `lib`
     → `lib/db` that's just a pass-through? `AGENTS.md`'s call-stack rule bans that.
   - **Drift between doc and tree**: does the directory tree in `ARCHITECTURE.md` still match
     what's actually in `app/`? Has a new top-level convention emerged (a new route group, a
     new `lib/` subdirectory) that isn't documented?
   - **New patterns worth adopting or reverting**: if the same new shape shows up 2+ times
     independently, that's a signal — either fold it into `ARCHITECTURE.md` as a sanctioned
     pattern, or flag it for cleanup if it contradicts an existing rule.

4. **Report.** For a manual review, summarize findings directly. For a scheduled run,
   produce a short report and, only where the fix is unambiguous and small (a rename, a move,
   a baseline update), open a PR making it — do not bundle ambiguous judgment calls into that
   PR; flag those in the report instead for a human to decide.

## What this skill does not do

It doesn't second-guess `AGENTS.md` (craft — doc comments, function shape, error handling)
or test placement (no `TESTING.md` exists yet). Stay in the "where does this file live and
is it named well" lane.
