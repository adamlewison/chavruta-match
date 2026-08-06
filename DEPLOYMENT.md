# Deployment & preview environments

How code gets from a pull request to production, and where the databases come from.
For code standards see [`AGENTS.md`](./AGENTS.md); for structure, [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## The model

Three databases exist, with three different lifetimes. Confusing them is the usual source
of "should the preview data persist?" — the answer differs per tier.

| Database | Neon branch | Lifetime | Contents |
|---|---|---|---|
| Production | `main` | Permanent | Real user data. Only `deploy-production.yml` touches it. |
| Preview base | `preview-base` | Permanent | Curated fake data. Never deployed to; exists only to be copied. |
| Per-PR preview | `preview/pr-<N>` | Created when the PR opens, deleted when it closes | A copy-on-write clone of `preview-base`, plus that PR's migrations. |

`preview-base` is the thing that persists between PRs. Each PR gets a private clone of it,
so two open PRs can run conflicting migrations without touching each other's data, and
neither can corrupt the shared baseline. Because Neon branches are copy-on-write, a clone
is ready in seconds and stores only the pages the PR actually changes.

Preview databases deliberately contain **no production data**. Every seeded account uses
the reserved `@vruta.test` domain, so nothing in a preview can email a real person.

## What runs on a pull request

Four workflows. `ci.yml` runs on every PR including forks; the rest need secrets and are
skipped for fork PRs.

**`ci.yml`** — three parallel jobs:
- *Lint, typecheck, test* — `eslint`, `tsc --strict`, Vitest, plus the architecture and
  test-suite guards.
- *Build* — `next build`. Catches what typecheck cannot: bad imports, server/client
  boundary violations, prerender failures.
- *Migrations & schema drift* — boots a throwaway PostGIS container, installs extensions,
  applies **every migration from an empty database**, then runs `drizzle-kit generate` and
  fails if it produces anything. That last step is the one that catches someone editing
  `lib/db/schema.ts` without committing a migration.

**`preview.yml`** — creates `preview/pr-<N>` off `preview-base`, installs extensions,
applies migrations, seeds, then builds and deploys to Vercel with that branch's
`DATABASE_URL` injected. Comments the preview URL on the PR.

**`preview-cleanup.yml`** — deletes the Neon branch when the PR closes. Branches also carry
a 14-day `expires_at` as a backstop in case this never fires.

**`deploy-production.yml`** — waits for CI to pass on `main`, applies migrations to
production, then builds and deploys.

The two migration checks answer different questions and both are worth having. The CI
container proves migrations work on an **empty** database. The preview branch proves they
work against a database that **already has rows** — which is where migrations actually
break (a `NOT NULL` column with no default, a narrowed type, a unique index over
duplicate data).

## Why Vercel's Git integration is off

`vercel.json` sets `git.deploymentEnabled: false`, so Vercel no longer deploys on push.
GitHub Actions owns both preview and production deploys instead. Two reasons:

1. **Ordering.** Vercel's Git integration starts building the moment you push — before
   migrations have run. A PR that adds a column would deploy code querying a column that
   does not exist yet, and 500 until someone redeployed by hand.
2. **Gating.** Vercel deploys independently of CI, so a red build still shipped to
   production. Now `deploy-production.yml` only fires on a green CI run.

The cost is that deploys need `vercel build` in Actions. That is why the Vercel CLI version
is pinned in both workflows — bump it deliberately, in a commit.

---

## One-time setup

Nothing below can be done from the repository; these are dashboard and CLI steps.

### 1. Create the `preview-base` Neon branch

In the Neon console, create a branch named exactly `preview-base` from your production
branch. It will arrive holding a copy of production data — the next step replaces that.

Copy its connection string, then, **checking very carefully that you have the
`preview-base` URL and not production**:

```bash
export DATABASE_URL='<preview-base connection string>'

npm run db:reset          # DESTRUCTIVE: drops and recreates the public schema
npm run db:extensions     # postgis, cube, earthdistance
npm run db:migrate
npm run db:seed:preview   # regions, synagogues, and the @vruta.test demo accounts
```

`db:reset` drops everything. Run it against production and you lose production. Consider
setting a Neon [protected branch](https://neon.com/docs/guides/protected-branches) on
`main` so this is not merely a matter of care.

`db:seed:preview` refuses to run if it finds any account whose email is outside
`@vruta.test`, which is the tripwire for exactly this mistake.

### 2. Neon API key

Neon console → **Account settings → API keys** → create a key. Copy it; it is shown once.
Note your project ID from **Project settings → General**.

### 3. Vercel: link the project and collect IDs

```bash
npx vercel@58.7.1 link      # select the existing vruta project
cat .vercel/project.json    # contains orgId and projectId
```

Create a token at **Vercel → Account Settings → Tokens**, scoped to this project.

Make sure the Vercel project's **Preview** and **Production** environment variables are
populated with everything the app needs (`AUTH_SECRET`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `UPLOADTHING_TOKEN`).
`vercel pull` reads them at build time. `DATABASE_URL` is the exception — the preview
workflow overwrites it per PR, so whatever is set there is ignored for previews.

### 4. GitHub repository settings

**Settings → Secrets and variables → Actions.**

Under *Variables*:

| Name | Value |
|---|---|
| `NEON_PROJECT_ID` | Neon project ID |

Under *Secrets*:

| Name | Value |
|---|---|
| `NEON_API_KEY` | Neon API key from step 2 |
| `VERCEL_TOKEN` | Vercel token from step 3 |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
| `DATABASE_URL` | **Production** connection string — used only by `deploy-production.yml` |

Then create a `production` environment under **Settings → Environments**. Adding required
reviewers there turns every production deploy into an explicit approval.

### 5. Branch protection

**Settings → Branches → add a rule for `main`.** Require pull requests, and require these
status checks: `Lint, typecheck, test`, `Build`, `Migrations & schema drift`.

Deliberately *not* required: the preview deploy. A flaky deployment should not block a
merge that CI has already approved.

---

## Day-to-day

### Changing the schema

```bash
# 1. edit lib/db/schema.ts
npm run db:generate    # writes drizzle/NNNN_*.sql and updates the snapshot
npm run db:migrate     # apply locally
git add drizzle/       # the generated files are part of the change
```

Skipping `db:generate` fails the *Migrations & schema drift* check. `db:push` exists for
throwaway local experiments and should never be how a change reaches a shared database —
it diffs against live state instead of replaying the committed history, so two
environments can silently end up with different schemas.

### Refreshing the demo data

Edit `drizzle/seed-preview.ts`, then re-run the step-1 commands against `preview-base`.
Existing per-PR branches keep the old data until they are recreated; new PRs pick it up
immediately.

`drizzle/seed-reference.ts` holds regions and the synagogue list — real reference data, no
user data — and is safe to run anywhere, including production, via `npm run db:seed`.

### Costs and limits

Every open PR holds one Neon branch. Neon's free plan caps branch count, so if PRs are
opened faster than they are closed you will hit the ceiling and `preview.yml` will start
failing. The 14-day `expires_at` and the cleanup workflow are what keep this bounded; if
you still hit it, the fix is closing stale PRs, not raising the timeout.

Compute is billed per branch while active. Branches suspend when idle by default.

## Troubleshooting

**Preview deploy 500s with a missing column.** The preview branch predates the migration.
Push an empty commit to rerun `preview.yml`, or close and reopen the PR for a fresh branch.

**"Migrations & schema drift" fails but you did run `db:generate`.** The generated files
are probably unstaged. The check runs `git status --porcelain -- drizzle`, so an untracked
migration fails it just as a modified one does.

**`preview.yml` fails at *Create Neon branch* with a branch limit error.** Close stale PRs,
or delete their branches in the Neon console.

**Nothing deploys after merging to `main`.** `deploy-production.yml` only runs when the CI
workflow concludes successfully on `main`. Check the CI run first; `workflow_run` triggers
show up under the *Deploy production* workflow, not on the commit.

**A fork's PR has no preview.** By design — fork PRs run without secrets. Push the branch
to this repository to get one.
