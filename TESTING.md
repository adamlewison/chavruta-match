# Testing

Testing law for this repository. For where code lives see `ARCHITECTURE.md`; for how code
is written see `AGENTS.md`. This document owns what gets tested, how, and what the tooling
looks like.

## The principle

Spend tests on **risk: blast radius × how quietly it can break.**

- **Blast radius** — money, auth/permissions, data loss, primary user journey, published contracts.
- **Quietly** — type errors and white-screens announce themselves; an off-by-one in a scoring
  formula, a permission check returning the wrong boolean, a timezone bug — those are silent.

Coverage is a diagnostic, never a target. No coverage percentage may gate a build.

## Runner

**Vitest.** Config: `vitest.config.ts`. One runner; don't add a second.

```
npm test            # run the full suite
npm run test:check  # run the guard script
```

## The four triggers — when a test gets written

1. **Bug fixed.** Write it first, watch it fail, fix the code. Non-negotiable.
2. **Critical path.** Auth, permissions, data mutation, primary user journey.
3. **Dense logic.** A function whose input space genuinely branches: parsing, dates/timezones,
   scoring, state machines. See: `lib/availability.ts`.
4. **Published contract.** A schema or API shape something external depends on.

If a change matches none of these, it ships with no new test.

## When a test does NOT get written

Delete these on sight:

- Getters, setters, constructors, constants, config objects, pass-through wrappers.
- Assertions that only restate what the type system already proves.
- Tests that mock your own modules and assert the mock was called.
- Snapshots (by default — at most one for a genuinely stable, complex output).
- Framework behaviour (router routes, ORM saves, validation library validates).
- Anything added to move a coverage number.
- The same behaviour covered at two tiers — keep the outermost one.

**Default budget for a normal feature: 0–1 scenario, 1–3 boundary, unit tests only if there
is dense logic.** When the test diff is larger than the source diff, justify it in a sentence.

## Tiers

| Tier | What | How many |
|---|---|---|
| 0 — free | Type checker, linter | Everything they can prove. Never test what the compiler guarantees. |
| 1 — scenario | Real running app, user-facing journey | One per critical journey. Not yet set up. |
| 2 — boundary | Module/route through its public surface, real collaborators, fake only system edges | The target bulk of the suite — not yet set up (requires DB infrastructure). |
| 3 — unit | Pure function, table-driven | Only where logic is dense. **Current tier.** |

Weight sits at tier 2 (boundary) in the long run. We're at tier 3 now because the only
code testable without infrastructure is `lib/availability.ts`.

## Fakes stop at the system edge

- Fake only what you don't own or can't control: outbound network, email/SMS providers,
  the clock, randomness, anything that costs money per call.
- **Never mock your own modules.** If a test is only writable by mocking internal code,
  the side effects need pushing out of that logic — it's a design finding, not a testing
  problem.
- Prefer one fake at the boundary (HTTP interceptor, in-memory or throwaway DB, injected
  clock) over mocks scattered inside.

## Determinism

- No `sleep`, no arbitrary waits. Wait on a condition or use fake timers.
- No test may depend on today's date, the machine's timezone, or unseeded randomness.
- No shared mutable state; no ordering dependence. Every test creates its own data and
  passes alone and in parallel.
- A flaky test is a broken test. Fix or delete within a day. **Never** add a retry.

## Quality bar

- Name states the behaviour and condition: `returns 0 when bitmaps share no slots`,
  not `test overlap 2`.
- One reason to fail: arrange, act, assert.
- No branching in a test body. Table-driven cases, yes; `if` inside a test, no.
- Assert on observable behaviour: return value, persisted state, what the user sees.
  Never on private internals or call counts of your own functions.
- **Before keeping a test, break the code on purpose and confirm it fails.**

## Test file location

Follows `ARCHITECTURE.md`. Test files live next to the module they test:
`lib/availability.ts` → `lib/availability.test.ts`.

## Reference tests

Copy the shape of these canonical files — one per tier in actual use:

| Tier | File |
|---|---|
| 3 — unit | [`lib/availability.test.ts`](lib/availability.test.ts) |

The shared harness (factories, helpers) for that file is inline — no shared fixture file
needed while the suite fits in one file.

## Decision recipe

| I changed… | Do I write a test? | Tier |
|---|---|---|
| A bug in `lib/availability.ts` | Yes — write it first, watch it fail | 3 |
| A pure utility function with branching input space | Yes | 3 |
| A server action (happy path, validation) | Yes, but needs real DB — document as deferred | 2 |
| Permission logic in a server action | Yes, high priority once DB infra exists | 2 |
| A UI component (data display, no logic) | No | — |
| A getter, constant, or config value | No | — |
| A shadcn UI primitive | No | — |
| A Next.js route handler (routing only) | No | — |
| A schema field added to the DB | No (type system covers it) | — |

## Design findings (code that resists testing)

These are production-code issues that make specific units untestable. They're noted here
so they don't get a mock injected instead — the right fix is at the source.

1. **`getTimezoneOffsetHours` in `lib/availability.ts`** reads `new Date()` internally.
   It returns the current UTC offset for a timezone, which changes at DST boundaries.
   Testing it directly means tests break twice a year. Callers (`createTentacle`,
   `updateTentacle`) should receive an offset value rather than calling this function —
   compute it once at the boundary and pass it in.

2. **`normalizePostcode` in `app/actions/onboarding.ts`** is an unexported private function
   in a `"use server"` file. To test it, extract it to `lib/` and export it.

3. **`respondToConnection` and `sendConnectionRequest`** in `app/actions/connections.ts`
   are high-risk auth/permission code that's fully coupled to DB + auth. Testing them
   properly requires a real Postgres instance with NextAuth. Highest priority once
   DB test infrastructure exists.

## Guard script

`scripts/check-tests.mjs` — run via `npm run test:check`. Exits non-zero with `file:line`
and the rule broken. Checks:

- No focused tests (`.only`)
- No skipped tests without an issue reference (`// issue: #NNN`)
- No internal module mocks (relative paths or `@/` aliases)
- No coverage threshold configured as a gate
- No `sleep` or bare `setTimeout` in test files
- Prints test count and test-to-source ratio on every run

Violations already present when the check was introduced are baselined in
`.tests-baseline.json` — new violations fail immediately; the baseline only ever shrinks.

## CI

Tests run on every PR and push to `main` (see `.github/workflows/architecture.yml`).
The `test` step must complete in seconds. Slower tiers (scenario, boundary with containers)
go behind their own job when they exist.
