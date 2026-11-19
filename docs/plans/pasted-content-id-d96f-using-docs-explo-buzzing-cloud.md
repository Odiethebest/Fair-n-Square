# Plan: #3 Organizer creates an event with a weighted rubric

Branch `feat/3-create-event` · Sources: issue #3, `docs/explore/3-create-event.md` · 4 steps

## Context

US1 is the first vertical slice: page → server action → domain validation → Prisma. Nothing below `src/app` exists yet, so this issue also lays the groundwork later issues build on: the first schema and migration, the shared Prisma client, `requireUser` / `requireEventRole`, and the first `src/domain` module. The organizer fills in a form with an event name, optional settings, and 1–10 weighted criteria. The event is saved in `DRAFT` with the creator as `ORGANIZER`, and the organizer lands on `/events/[eventId]/manage`. Nobody else can see that page.

## Decisions (answers to the Explore open questions)

- **Tests:** unit tests only, covering the domain rules and a pure authorization rule. AC1 and AC4 are checked by hand in the browser. The PR states the Definition of Done gap, and a follow-up issue adds `test:integration`.
- **Dependencies:** add `zod` as a direct dependency (^4). No shadcn/ui; use plain Tailwind.
- **Prisma generator:** keep `prisma-client-js` and import from `@/generated/prisma`.
- **First migration:** Event, Criterion, and EventMember only, with no `teamId`. `EventMember.userId` holds the Clerk user ID, and there is no User table. IDs are `cuid()`.
- **Trimming and duplicates:** trim names, and compare duplicate criterion names case-insensitively (`toLowerCase()`).
- **Limits:** 1–10 criteria; criterion names 1–60 characters; event name 1–100 characters; k is an integer from 1 to 10; the scale uses integers from 0 to 100 with min < max. Blank fields default to k = 3 and a 1–10 scale. Criteria keep the order they were entered in (`position`).
- **Errors:** report every failure at once as `{ code, path }`. The UI maps codes to messages and keeps what the organizer entered.
- **Access:** signed-out visitors go to Clerk's hosted sign-in. A nonexistent event and a non-organizer get the same 404. `requireUser` uses `auth.protect()`, and `requireEventRole` calls `notFound()`. The proxy stays public, and every check lives in server code.
- **Migration target:** the current Neon branch.

## Execution rules

1. **After approval:** commit this plan file by itself, staged by path, with the subject `docs(plans): plan event creation with a weighted rubric (#3)`. It keeps its current file name, because `docs/plans/` is evidence that Prettier ignores and that stays byte-for-byte as written.
2. **One step at a time:** implement the step, then run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run format:check`, plus the step's own checks. Show the diff, including new untracked files, and **stop before committing**. Commit only after you approve.
3. **Step 1 is test-first:** write the tests against a type-only stub, run them, show the failing output, and **stop (RED)**. Implement only after your OK. Tests and implementation go in one commit, and the body says it was test-first.
4. **Commit format:** `<type>(<scope>): <summary> (#3) [plan n/4]`. Stage files by path; never `git add -A`. `docs/hw4/notes-ziqi.md` stays unstaged. No push and no PR without asking.
5. **Never** call `redirect()` or `notFound()` inside `try/catch`.
6. **Stop and ask if:**
   - `db:migrate` reports drift (it exits 130 and suggests `migrate reset`) or data-loss warnings. Never run `migrate reset`, `--force`, or `db push`.
   - Any dependency other than `zod` seems necessary.
   - A domain rule above looks wrong or doesn't cover a case.

## Step 1: Domain rules, test-first (AC1, AC2, AC3, AC4 rules)

Files:

- `src/domain/rubric.ts`
  - Named constants: `TOTAL_WEIGHT = 100`, `MIN_CRITERIA = 1`, `MAX_CRITERIA = 10`, `MAX_EVENT_NAME_LENGTH = 100`, `MAX_CRITERION_NAME_LENGTH = 60`, `DEFAULT_JUDGES_PER_TEAM = 3`, `MIN/MAX_JUDGES_PER_TEAM = 1/10`, `DEFAULT_SCALE_MIN/MAX = 1/10`, `SCALE_LOWER/UPPER_BOUND = 0/100`.
  - Types: `EventStatus` (`"DRAFT" | "JUDGING" | "CLOSED" | "RELEASED"`) and `EventDraftInput`, which is `{ name: string; judgesPerTeam?: number; scaleMin?: number; scaleMax?: number; criteria: { name: string; weight: number }[] }`. The numbers may be `NaN` or non-integers; the domain decides validity.
  - `EventDraft` is `{ name, status: "DRAFT", judgesPerTeam, scaleMin, scaleMax, criteria: { name, weight, position }[] }`.
  - `RubricError` is `{ code: RubricErrorCode; path: (string | number)[] }`.
  - `validateEventDraft(input)` returns `{ ok: true; value: EventDraft } | { ok: false; errors: RubricError[] }`.
  - Error codes and paths:

    | Code | Path |
    | --- | --- |
    | `event_name_required`, `event_name_too_long` | `["name"]` |
    | `criteria_missing`, `criteria_too_many` | `["criteria"]` |
    | `criterion_name_required`, `criterion_name_too_long` | `["criteria", i, "name"]` |
    | `criterion_name_duplicate` (on each row that repeats an earlier name) | `["criteria", i, "name"]` |
    | `criterion_weight_invalid` (not a positive integer) | `["criteria", i, "weight"]` |
    | `weights_sum_not_100` (checked only when every weight is valid) | `["criteria"]` |
    | `judges_per_team_invalid` | `["judgesPerTeam"]` |
    | `scale_min_invalid` | `["scaleMin"]` |
    | `scale_max_invalid` | `["scaleMax"]` |
    | `scale_min_not_below_max` (checked only when both are valid, after defaults) | `["scaleMax"]` |

- `src/domain/rubric.test.ts`
  - Valid draft: `DRAFT` status, trimmed names, positions 0..n−1 in entered order.
  - Defaults when blank; custom k = 5 and scale 0–100 accepted.
  - Boundaries: 1 criterion at weight 100, 10 criteria, names of exactly 60 and 100 characters.
  - Each failure on its own: sum of 90; weights 0, −5, 2.5, and NaN (with no sum error); blank or whitespace-only name; 61 characters; "Design" next to " design "; 0 and 11 criteria; event name blank or 101 characters; k of 0, 11, and 2.5; scale of −1, 101, 5–5, and 10–1; min 10 with max blank.
  - Several failures reported together.
  - One fast-check property: any 1–10 unique names with positive integer weights summing to 100 → `ok`, with order preserved.
- `src/domain/event-access.ts`: `EventRole` (`"ORGANIZER" | "JUDGE" | "TEAM"`) and the pure rule `hasEventRole(memberships: { eventId: string; role: EventRole }[], eventId: string, allowed: EventRole[]): boolean`.
- `src/domain/event-access.test.ts`
  - An organizer of this event is allowed.
  - A judge or team member of this event is rejected for `["ORGANIZER"]`.
  - A non-member is rejected.
  - An organizer of a different event is rejected.
  - A judge is allowed when `JUDGE` is among the allowed roles.

RED setup: the stubs export the real types and constants, with bodies that return placeholders (`{ ok: false, errors: [] }` / `false`). That way the suite fails on assertions, not on imports or types.

Verify: the RED output is shown, then GREEN passes `npm test`; typecheck, lint, and format:check pass.

Commit: `feat(rubric): validate event drafts and event roles (#3) [plan 1/4]`. The body says it was test-first.

## Step 2: Schema, migration, and Prisma client (supports AC1)

Files:

- `prisma/schema.prisma`
  - Enums `EventStatus` (DRAFT, JUDGING, CLOSED, RELEASED) and `EventRole` (ORGANIZER, JUDGE, TEAM).
  - `Event`: `id cuid`, `name`, `status @default(DRAFT)`, `judgesPerTeam Int`, `scaleMin Int`, `scaleMax Int`, `createdAt`, `updatedAt`. There are no database defaults for the settings, because the domain is the single source of defaults.
  - `Criterion`: `id`, `eventId` → Event (`onDelete: Cascade`), `name`, `weight Int`, `position Int`, `@@unique([eventId, position])`.
  - `EventMember`: `id`, `eventId` → Event (Cascade), `userId` (Clerk ID), `role EventRole`, `createdAt`, `@@unique([eventId, userId, role])`, `@@index([userId])`.
- `prisma/migrations/<timestamp>_create_event_rubric/migration.sql` and `migration_lock.toml`, generated by `npm run db:migrate -- --name create_event_rubric`.
- `src/server/db.ts`: `new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) })`. It throws a clear error if `DATABASE_URL` is unset, and the client is cached on `globalThis` outside production so hot reload doesn't open extra pools.

Verify:

- `npm run db:migrate -- --name create_event_rubric`, then `npm run db:generate`, then the standard checks.
- Review `migration.sql` in the diff: only creates, and no drops.
- `npx prisma migrate status` reports "up to date".

Commit: `feat(db): add Event, Criterion, and EventMember schema (#3) [plan 2/4]`

## Step 3: Auth helpers and the organizer manage page (AC4; AC1 display)

Files:

- `package.json` and `package-lock.json`: `npm install zod@^4`. This needs your approval at the prompt.
- `src/server/auth.ts`
  - `requireUser()` returns `{ userId }` from `auth.protect()`. Signed-out page requests go to the hosted sign-in, and signed-out Server Action requests get a 401.
  - `requireEventRole(eventId: unknown, roles)` does this in order:
    1. Calls `requireUser()`.
    2. Checks `z.cuid().safeParse(eventId)`.
    3. Runs `db.eventMember.findMany({ where: { eventId, userId } })`.
    4. Checks `hasEventRole(...)`.
  - On any failure it logs `{ msg: "authz_denied", eventId, required }` without the user ID, then calls `notFound()`. It returns `{ userId, eventId }`. A nonexistent event has no memberships, so it gets the same 404.
- `src/server/queries/events.ts`: `getManageEvent(eventId)` calls `requireEventRole(eventId, ["ORGANIZER"])` → `db.event.findUnique` with `select` (criteria ordered by `position`) → `ManageEventDto` (`id`, `name`, `status`, `judgesPerTeam`, `scaleMin`, `scaleMax`, `criteria: { name, weight }[]`).
- `src/app/events/[eventId]/manage/page.tsx`: a Server Component typed with `PageProps<"/events/[eventId]/manage">`. It awaits `params`, then shows the name, the status, the settings, and the rubric (name and weight) in order, using plain Tailwind and no `dangerouslySetInnerHTML`.

Verify: the standard checks plus `npm run build`. Then, with `npm run dev`:

- Signed out, `/events/anything/manage` goes to Clerk sign-in.
- Signed in, both `/events/not-a-cuid/manage` and a well-formed but nonexistent cuid give the default 404.

Commit: `feat(events): add organizer manage page behind requireEventRole (#3) [plan 3/4]`

## Step 4: Create-event form and action (AC1, AC2, AC3, AC4)

Files:

- `src/server/validation/create-event-form.ts`
  - Zod checks the shape of `name`, the optional `judgesPerTeam`, `scaleMin`, and `scaleMax` (string or null), and `getAll("criterionName")` and `getAll("criterionWeight")`: arrays of strings of equal length, capped at 50 rows and 1,000 characters for payload sanity.
  - A blank optional field becomes `undefined`; `/^-?\d+$/` becomes a number; anything else becomes `NaN`, so the domain reports it.
  - `parseCreateEventForm(formData)` returns `EventDraftInput` or `{ code: "invalid_request" }`. It lives here because a `"use server"` file may export only async functions.
- `src/server/validation/create-event-form.test.ts`: covers the FormData → input mapping, including blanks, `NaN` for non-integers, row order, and mismatched arrays.
- `src/server/actions/events.ts` (`"use server"`): `createEvent(prevState, formData)`
  1. `requireUser()` (any signed-in user may create, because there is no event to hold a role in yet).
  2. `parseCreateEventForm`.
  3. `validateEventDraft`; on failure, return `{ errors }`.
  4. One nested `db.event.create` with criteria and an `ORGANIZER` membership, so the write is atomic and nothing is saved on failure. It selects only `id`.
  5. `redirect(\`/events/${id}/manage\`)`, outside any `try`.
- `src/app/events/new/page.tsx`: a Server Component that calls `await requireUser()` and renders the form.
- `src/app/events/new/create-event-form.tsx` (`"use client"`)
  - `useActionState(createEvent, { errors: [] })` with controlled state for all fields and rows, so values survive an error.
  - Add-row and remove-row buttons (add is disabled at `MAX_CRITERIA`; removing the last row is allowed, so the AC2 "no criteria" case can be submitted).
  - A live "Total: x / 100".
  - Errors in an `aria-live` summary and next to fields by `path`. Code → message mapping lives here.
  - The pending state disables submit, and the layout works at 375 px.
- `CLAUDE.md`, two convention lines:
  1. Validation failures are `{ ok: false, errors: { code, path }[] }`, and the UI maps codes to messages.
  2. Form parsers live in `src/server/validation/`, because `"use server"` files export only async functions.

Verify: the standard checks plus `npm run build`. Then the manual browser checks, which need a second Clerk test user for AC4:

- **AC1:** "Demo Day" with Impact 50, Design 30, Demo 20 → lands on `/manage` showing the name, `DRAFT`, k = 3, scale 1–10, and the criteria in order.
- **AC2:** sum 90; weights 0, 2.5, and "abc"; a blank name; "Design" and " design "; all rows removed. Every error shows at once, the values are kept, and the Event count is unchanged (check Prisma Studio via `! npx prisma studio`, or the Neon console).
- **AC3:** blank settings → 3 and 1–10. Then k of 0, 11, and 2.5, and scales of 5–5, 10–1, −1, and 101 are rejected, while k = 5 with 0–100 is saved.
- **AC4:**
  - Signed out, `/events/new` goes to sign-in.
  - The second user opening the first user's `/manage` gets a 404, the same as a nonexistent ID.
  - Signed out on `/manage` goes to sign-in.

Commit: `feat(events): create an event with a weighted rubric (#3) [plan 4/4]`

## Afterwards (not a plan step; ask first)

The PR for #3 covers:

- AI disclosure and a C.L.E.A.R. review.
- The manual check results.
- The Definition of Done gaps: no integration tests proving role rejection (follow-up issue for `test:integration`), no CI workflow yet, and the generated client must be built with `npm run db:generate` before `typecheck` after a fresh clone.
