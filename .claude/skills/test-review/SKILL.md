# test-review

Review the test suite against the testing standard and prune what isn't paying rent.

## What to do

1. **Run the guard script first.**
   ```
   npm run test:check
   ```
   Fix any new violations before reviewing anything else. If the baseline has stale entries,
   shrink it — don't leave entries that no longer apply.

2. **Run the full suite and confirm it's green.**
   ```
   npm test
   ```
   A flaky test is a broken test. Fix it or delete it. Never add a retry.

3. **Review each test against the standard in `TESTING.md`.** For every test ask:

   - **Does it assert behaviour, or implementation?** A test that asserts how many times your
     own function was called, or that mocks an internal module and checks the mock was
     called, is testing implementation. Delete it.

   - **Would it fail if the feature broke?** If you can break the relevant code and the test
     still passes, it is a false guarantee — worse than no test. Delete it, or rewrite it so
     it actually detects the failure.

   - **Is it at the right tier?** If a unit test covers the same behaviour as a boundary
     test, the unit test is redundant. Delete the inner one. See tier definitions in
     `TESTING.md`.

   - **Does it have one reason to fail?** If the test has branching (`if` inside the body),
     split it into separate cases.

   - **Is the name descriptive?** Name states the behaviour and the condition — not `test 2`
     or `should work`.

4. **Check for tests that should now be deleted.** This is the most important step because
   nothing else in this codebase proposes removing tests — a suite only ever grows without
   deliberate pruning. Candidates for deletion:

   - Getters, setters, constructors, constants, config objects that now have type-level
     guarantees.
   - Tests that only restate what `tsc --strict` already proves.
   - Tests of framework behaviour (routing, ORM, validation library).
   - Snapshot tests added without a comment explaining why that specific output shape is
     load-bearing.
   - Tests added to reach a coverage number.
   - The same behaviour covered at two tiers — keep the outermost one.

   **Present the delete list first**, each with a one-line reason and what behaviour (if any)
   stops being covered. Get confirmation before deleting.

5. **Check the critical paths from the audit.** Are the critical paths still covered as code
   changes? See the "Design findings" section in `TESTING.md` for paths that resist testing
   due to infrastructure coupling — note any regression there without adding mocks.

6. **Report the before/after numbers:** test count, test-to-source ratio (from
   `npm run test:check` output), and which critical-path gaps (if any) opened since the
   last review.

## Schedule

Run this skill:
- Weekly (scheduled in CI via `.github/workflows/architecture-review.yml` or equivalent).
- On any PR where the test diff is larger than the source diff.
- Whenever a test is deleted — confirm the deletion was intentional and the gap is
  acceptable.

## What this skill does NOT do

- It does not fix production code. If a design finding blocks a test, report it and tag it
  as a craft-standard issue — don't inject a mock to work around it.
- It does not add tests to reach coverage. If coverage reveals a gap, evaluate it against
  the four triggers in `TESTING.md` before writing anything.
- It does not run scenario (Playwright) or boundary (DB integration) tests that aren't set
  up yet — note when those tiers are still missing for high-risk paths.
