# Fair-n-Square

Judging platform for hackathons, demo days, and class showcases. Organizers build a weighted rubric and invite judges and teams; judges score their assigned teams on their phones; rankings normalize each judge's scores so winners don't depend on which judges a team drew.

- Product requirements and user stories: @docs/prd.md
- Setup and human-facing overview: README.md (not auto-loaded; read it when needed)

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — production build
- `npm run lint`, `npm run format:check`, `npm run format` — ESLint and Prettier
- `npm run typecheck` — `next typegen`, then `tsc --noEmit`
- `npm test` — unit tests (fast, no database); `npm test -- <path>` runs one file
- `npm run test:watch` — Vitest watch mode
- `npx vitest run src/path/to/file.test.ts` — one test file
- `npx vitest run -t "test name"` — tests matching a name
- `npm run db:generate` — generate the Prisma client into `src/generated/prisma`
- `npm run db:migrate -- --name <name>` — create a Prisma migration

Copy `.env.example` to `.env` and fill it in before running the app or Prisma commands.

Planned (not set up yet; do not run):

- `npm run test:integration` — server-layer tests against Postgres (`TEST_DATABASE_URL`)
- `npm run test:coverage` — unit + integration with coverage; CI fails below 70%
- `npm run test:e2e` — Playwright
- `npm run test:mutation` — Stryker on `src/domain`
- `npm run db:seed` — load the demo event

Before calling a task done, run `npm run typecheck`, `npm run lint`, and the tests that cover the change.

## Tech stack

- Next.js (App Router, Server Components, Server Actions) with TypeScript in strict mode
- Tailwind CSS and shadcn/ui
- PostgreSQL on Neon, accessed only through Prisma
- Clerk for sign-in; roles live in our database (see Architecture decisions)
- Zod for every input that crosses a trust boundary
- Vitest, fast-check, Stryker, Playwright
- GitHub Actions for CI; Vercel for preview and production deploys
- Stretch: Claude Agent SDK for AI-drafted team feedback

Exact versions are in package.json.

## Versions are newer than most training data

Next.js 16, React 19.3, Clerk 7, Prisma 7, Tailwind 4, and Vitest 5. Their APIs differ from older versions you may remember. Next.js ships version-matched docs in `node_modules/next/dist/docs/`; check them, or the installed package's types, before relying on memory. Specific differences already in this repo:

- **Next.js 16 middleware lives in `src/proxy.ts`**, not `middleware.ts`. It currently runs `clerkMiddleware()` with no route protection, so every route is public until protection is added there or checked in server code.
- **Route prop types are generated globals.** `LayoutProps<"/">` and `PageProps<...>` come from `next typegen`, which is why `typecheck` runs it before `tsc`.
- **Clerk 7** uses `<Show when="signed-in">` / `<Show when="signed-out">` (see `src/app/layout.tsx`) instead of the older `<SignedIn>` / `<SignedOut>`.
- **Tailwind 4 runs through a Turbopack loader** (`@tailwindcss/turbopack` in `next.config.ts`). There is no PostCSS config. Theme tokens live in `@theme` in `src/app/globals.css`.

## Architecture

Three layers. Dependencies point one way: `src/app` → `src/server` → `src/domain`.

- `src/domain/` — pure TypeScript rules: rubric math, judge assignment, normalization, ranking, anomaly flags, event status transitions. No imports from Next.js, Prisma, Clerk, or `src/server`. No `Date.now()` or `Math.random()`; pass time and seeds in as arguments.
- `src/server/` — the only code that touches the database. Every action and query follows the same order: authenticate → authorize (event role) → validate with Zod → call the domain → read or write with Prisma → return a DTO.
- `src/app/` — routes and UI. Server Components load data through `src/server/queries`. Use Client Components only where interaction needs them (scoring form, progress board polling).

Routes:

- `/events` — events I belong to, in any role
- `/events/[eventId]/manage/...` — organizer: setup, invites, assignments, progress, results
- `/events/[eventId]/judge` and `/events/[eventId]/judge/[teamId]` — judge: assigned teams, scoring form
- `/events/[eventId]/team` — team: project details, released results
- `/join/[token]` — accept an invite
- `/api/events/[eventId]/progress` — organizer-only JSON for the polling progress board

### Database (Prisma 7 + Neon)

- The datasource URL is set in `prisma.config.ts`, not in `schema.prisma`, as Prisma 7 requires. The CLI (migrations) uses the direct connection `DATABASE_URL_UNPOOLED`.
- At runtime the app uses the pooled `DATABASE_URL` through `@prisma/adapter-neon`. The shared client will live in `src/server/db.ts`.
- The client is generated to `src/generated/prisma/`. That folder is gitignored and has no postinstall hook, so run `npm run db:generate` after a fresh clone or a schema change, before code that imports the client will typecheck or build. Import it from `@/generated/prisma`, not `@prisma/client`.

### Architecture decisions

1. Next.js full stack on Vercel with no separate API server: one deploy target and a preview per PR.
2. Live progress by polling about every 5 seconds instead of WebSockets: Vercel functions don't hold sockets, and a few seconds of delay is fine for judging.
3. Clerk handles identity only. Roles are per event (`EventMember`), so a user can organize one event and judge another, and authorization can be tested without Clerk.
4. Business rules are pure functions in `src/domain`, so they can be built test-first and checked with property-based and mutation tests.
5. Expected failures are returned as values (`{ ok: false, error }`). Throw only for programmer errors.

## Domain model

- **Event** — status `DRAFT → JUDGING → CLOSED → RELEASED`, plus `CLOSED → JUDGING` to reopen. Has `judgesPerTeam` (k, default 3) and an integer score scale (default 1–10).
- **Criterion** — name and integer weight; an event's weights sum to 100. The rubric can change only in `DRAFT`.
- **EventMember** — `(eventId, userId, role)`, role `ORGANIZER | JUDGE | TEAM`; TEAM members also have a `teamId`.
- **Team** — name, description, table number, demo URL.
- **Conflict** — a judge–team pair that the judge or the organizer declared.
- **Assignment** — a judge–team pair holding that judge's per-criterion scores, a comment, and `submittedAt`.
- **Invite** — event, role, and optional team; a random token stored only as a hash; expires; revocable.

## Domain rules

These are product decisions and the source of truth for `src/domain`. Ask before changing any of them.

- **Weighted score** of an assignment = Σ(weight × score) / 100, on the event's scale.
- **Assignment, hard rules:** every team gets exactly k distinct judges; never a conflicted judge; if a team has fewer than k eligible judges, return an error that names it and never under-assign silently.
- **Assignment, soft rules:** spread load evenly (with no conflicts, max load − min load ≤ 1). Same input and seed give the same output. Re-running only fills gaps left by removed judges or new teams; existing assignments of active judges stay put.
- **Normalization:** for each judge, z = (weighted score − that judge's mean) / that judge's population standard deviation, over the judge's submitted assignments. If the standard deviation is 0 (including a judge with one submission), all of that judge's z-scores are 0. A team's score is the mean z over its submitted assignments; a team with no submissions is unranked.
- **Invariant (property-tested):** adding a constant to every score from one judge, or multiplying them all by a positive constant, leaves every team's score unchanged.
- **Ranking:** team score, descending; ties go to the higher mean weighted score; if still tied, teams share the rank (1, 1, 3). Scores within 1e-9 count as equal.
- **Anomaly flags:** missing (assignment not submitted); flat (a judge with 3 or more submissions that all have the same weighted score); outlier (a weighted score that differs from the mean of at least 2 other judges on the same team by 30% or more of the scale range). Thresholds are named constants.
- **Locking:** judges can edit their own submission only while the event is `JUDGING`.
- **Visibility:** organizers see everything in their event. Judges see only their assigned teams and their own scores. Before `RELEASED`, teams see only their own team details. After `RELEASED`, all members see the ranking, and each team also sees its own per-criterion averages and comments. Judge names are never shown to teams. Nobody sees another event's data.

## Coding conventions

- No `any` (use `unknown` and narrow). No non-null `!` outside tests.
- Named exports. Default exports only where Next.js requires them (`page`, `layout`, `route`, and similar).
- Import through the `@/` alias (maps to `src/`). File names are kebab-case; React components are PascalCase.
- Server actions go in `src/server/actions/<feature>.ts` and queries in `src/server/queries/<feature>.ts`. Return DTOs, never raw Prisma objects.
- Validation failures are values: the domain returns `{ ok: false, errors: { code, path }[] }`, a form action returns `{ errors, entered }` so the form keeps what was typed, and the UI maps codes to messages.
- Form parsers live in `src/server/validation/`, because a `"use server"` file may export only async functions.
- Authorization goes through `requireUser()` and `requireEventRole(eventId, roles)` in `src/server/auth.ts`. Never write ad hoc role checks.
- Store timestamps in UTC and format them only in the UI.
- UI uses shadcn/ui components from `src/components/ui` and Tailwind classes; no new CSS files. Judge pages are mobile-first and must work at 375 px wide.
- Prettier with default settings (`.prettierrc.json` is `{}`). Line endings are forced to LF by `.gitattributes`.
- Commits follow Conventional Commits with the issue number, e.g. `feat(assignment): balance judge load (#12)`. TDD commits add `[RED]`, `[GREEN]`, or `[REFACTOR]` to the subject.
- Branches are `feat/<issue>-<slug>` or `fix/<issue>-<slug>`, one PR per issue, merged with a merge commit. Never squash: it erases the TDD history.

## Testing strategy

- **Strict TDD** for everything in `src/domain` and for authorization rules, one acceptance criterion at a time:
  - RED: write only the test for the current criterion and run it. It must fail on an assertion, not on a syntax or import error. Then stop for review.
  - GREEN: write the minimum code to pass. Do not edit tests. Do not implement later criteria.
  - REFACTOR: improve the code without changing behavior; all tests stay green.
- **Unit tests** (`src/**/*.test.ts`, next to the code): domain functions, with fast-check properties for assignment, normalization, and ranking. Compare floating-point values with a tolerance. Vitest only picks up `src/**/*.test.ts`, in the `node` environment.
- **Integration tests** (planned; `tests/integration/`): server actions and queries against a real Postgres, never a mocked database. Every action has tests showing that each non-permitted role, and members of other events, are rejected.
- **E2E tests** (planned; `e2e/`): one happy path per role. The organizer sets up and assigns, a judge scores on a mobile viewport, and a team sees results after release.
- **Targets** (planned): at least 70% coverage overall (enforced in CI), aiming for 90% or more in `src/domain`; mutation score of 80% or more for `src/domain`.
- Build test data with the factories in `tests/factories.ts` (planned). Each integration test starts from a clean database.

## Security (OWASP Top 10)

- **Broken access control** is the main risk here. Every action and query calls `requireEventRole`. Never trust an `eventId`, `teamId`, or role sent by the client: check that the resource belongs to the event and that the user holds the role. Middleware only redirects signed-out users and is never the authorization layer (CVE-2025-29927 showed it can be bypassed). Keep results hidden until `RELEASED`, enforced on the server.
- **Injection:** use Prisma only, never `$queryRawUnsafe`. Validate every input with Zod. Team descriptions and judge comments are untrusted, so never render them with `dangerouslySetInnerHTML`.
- **Cryptographic failures and secrets:** secrets live only in environment variables, never in code or logs. Only `NEXT_PUBLIC_*` variables reach the browser, so no secret ever gets that prefix. Invite tokens are random (at least 128 bits), stored hashed, expiring, and revocable.
- **Security misconfiguration:** set security headers (CSP, `frame-ancestors`, `Referrer-Policy`) in `next.config`; never return stack traces in production.
- **Vulnerable and outdated components:** commit the lockfile, run `npm audit` in CI, and ask before adding a dependency.
- **Authentication failures:** Clerk owns sign-in. Check the session on the server for every request. No custom password code.
- **Integrity and SSRF:** production deploys only from `main` after CI passes. The server never fetches URLs that teams or judges supplied.
- **Logging:** log authorization denials and edits rejected by locking, without secrets or personal data.
- **AI feature (stretch):** treat judges' notes as untrusted input that may contain prompt injection. The agent gets read-only tools scoped to one team and writes drafts only. Nothing reaches a team until an organizer approves it.

## Definition of Done

- The issue's acceptance criteria are covered by tests, and CI is green.
- Every new action or query calls `requireEventRole`, validates input with Zod, and has a test proving unauthorized roles are rejected.
- No secrets in code, logs, or client bundles.
- Judge screens checked at 375 px.
- The PR description includes AI disclosure (approximate % AI-generated, tools used, what the humans reviewed) and a C.L.E.A.R. review.
- CLAUDE.md is updated if the work produced a new convention or rule.

## Do / Don't

Do:

- Put every scoring, assignment, and visibility rule in `src/domain`, with tests, before wiring it to the UI.
- Read the scale and weights from the event's rubric.
- Ask when an acceptance criterion is ambiguous instead of guessing.
- Update `.env.example` whenever you add an environment variable.

Don't:

- Import Prisma, Clerk, or Next.js in `src/domain`.
- Edit or weaken a test to make it pass.
- Read, print, or modify `.env` or `.env.local`.
- Run destructive database commands (`prisma migrate reset`, `prisma db push --force-reset`) or edit a merged migration. Create a new migration instead.
- Show judge identities to teams, or results before release.
- Fetch URLs that teams or judges supplied.

## Workflow

- Use Explore → Plan → Implement → Commit for every issue. Read the relevant code first without editing. Plan in plan mode; plans are saved to `docs/plans/`. Implement one plan step at a time and commit each step.
- Acceptance criteria live in the GitHub issue as Given/When/Then. Reference the issue in commits and PRs.
- One task per session. State lives in issues, plans, and commits, so `/clear` between tasks is safe.

## Lessons learned

Append a dated, one-line rule whenever Claude repeats a mistake or a retro produces a new rule.
