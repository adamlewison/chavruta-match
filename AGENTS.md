<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture

Where code lives — directory shape, file naming, layer boundaries, import direction — is
governed by [`ARCHITECTURE.md`](./ARCHITECTURE.md), not this file. Read it before adding a
new file or moving an existing one.

# Code Standards

Code here should read like a well-kept open-source TS/React library. ESLint (`eslint-config-next`) and `tsc --strict` already own formatting, unused vars, and basic type safety — the rules below cover what tooling can't check.

## Documentation
- Every exported function (server actions, `lib/*` helpers, hooks) gets a one-to-two sentence TSDoc comment: what it does and why, not a restatement of the signature.
- Document non-obvious parameters and the return shape — especially the `{ error }` / `{ success }` result objects server actions return; name what triggers each branch.
- Comment raw `sql\`...\`` queries with what they compute; the SQL text alone doesn't explain intent (see `getMatches` in `lib/queries.ts` for the scale this applies at).
- No commented-out code and no stale comments describing removed logic — delete instead of parking it in a block comment.
- Inline comments explain *why* (a workaround, a constraint), never *what* the next line does.

## Function & call shape
- Keep the call stack at entrypoint (route handler / server action) → domain logic (`lib/*`) → data access (`lib/db`). Most of this codebase is already flat (action → db); don't add an intermediate layer unless it does real work — inline pass-through wrappers instead.
- One job per function; split when the name needs "and".
- Guard clauses over nested `if`s — bail early on missing session/invalid input, as the existing actions already do.
- Import at the top of the module; don't reach for `await import(...)` mid-function to dodge a circular import — restructure the module instead.

## Types & error handling
- No `any`, and no un-narrowed `as` casts except reading known-shape `FormData` fields (the established pattern) — validate the value before using it even then.
- Server actions return typed `{ error: string }` / `{ success: true, ... }` result objects for expected failures (validation, business rules) and throw only for truly exceptional states (no session). Keep new actions consistent with this split.
- Translate a Drizzle/Postgres error at the action boundary — never let a raw db error reach the client.
- Don't leave ad hoc debug `console.log`s in committed code. A load-bearing diagnostic log (e.g. the matching pipeline's timing logs) is fine — keep it structured and behind a `[TAG]` prefix like the existing ones.

## Restraint
- Build the query/action/prop the current screen needs; don't add options or params nobody calls yet.
- The third occurrence of the same shape is the signal to extract a helper, not the first.
- Match the surrounding file's style over personal preference.

## Subagent delegation
- Delegate mechanical, verifiable work — bulk renames, writing tests to a spec, gathering info across many files — to a subagent; keep architecture decisions and final review on the main thread.
- Parallelize only genuinely independent tasks; never two agents touching the same file.
- Always say when work is delegated, what it covers, and which model is doing it.

# Testing

Full rules in [`TESTING.md`](./TESTING.md). Short version:

- **Write a test for**: a bug fix (first, before fixing), critical-path auth/permissions/data mutation, dense logic with a branching input space, a published contract.
- **Don't write a test for**: getters, constants, pass-throughs, what the type system proves, framework behaviour, anything added for coverage.
- **Runner**: Vitest (`npm test`). One runner — don't add a second.
- **New tests match the shape of**: [`lib/availability.test.ts`](lib/availability.test.ts) (tier-3 unit reference).
- **Fakes stop at the system edge**: never mock your own modules. If a unit is only testable via an internal mock, that's a design finding — push the side effects out.
- **No coverage gate, ever.** Coverage is a diagnostic.
