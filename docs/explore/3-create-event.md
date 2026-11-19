# Explore: #3 Organizer creates an event with a weighted rubric

2026-11-19 · Explore phase (read-only) · Issue #3 (US1)

## Summary

The repo is still a scaffold. It has a root layout with Clerk buttons, the create-next-app home page, `src/proxy.ts` running `clerkMiddleware()`, and a Prisma schema with no models, no migrations, and no generated client. Because #3 is the first vertical slice, it also has to build the foundations later issues depend on: the schema and first migration, `src/server/db.ts`, `src/server/auth.ts`, the first `src/domain` module, and the first form. CLAUDE.md assumes two dependencies that aren't installed (Zod as a direct dependency, shadcn/ui). The integration and E2E tooling that AC1 and AC4 need is still only planned. We can unit-test the AC2 and AC3 rules and a pure authorization rule now.

## What exists

- `src/app/layout.tsx`: `ClerkProvider`, plus `<Show when="signed-out|signed-in">` with SignIn/SignUp/UserButton, typed with the generated `LayoutProps<"/">`. `page.tsx` is the create-next-app placeholder. There are no `/events` routes and no `not-found.tsx`.
- `src/proxy.ts`: `export default clerkMiddleware()` with the standard matcher (all non-static paths, `/api`, `/__clerk`). It protects no routes, so everything is public, but it makes `auth()` work in pages and actions.
- `prisma/schema.prisma`: generator `prisma-client-js` with output `../src/generated/prisma`; `postgresql` datasource with no URL; no models. `prisma.config.ts` loads `dotenv/config` and uses `env("DATABASE_URL_UNPOOLED")`.
- `.env.example`: the two Neon URLs and the Clerk keys. No Clerk sign-in/after-sign-in URL variables.
- `vitest.config.mts`: `node` environment, `src/**/*.test.ts`, `@` alias. `next.config.ts` only has the Tailwind Turbopack loader (no security headers).
- `.claude/settings.json`: `npm install` and `db:migrate` require approval; reading `.env` is denied.
- Installed versions: next 16.4.6, react 19.3.0, @clerk/nextjs 7.10.4, prisma / @prisma/client / @prisma/adapter-neon 7.10.1, @neondatabase/serverless 1.2.1, vitest 5.1.1, fast-check 4.10.3. Local Node is v26.5.0.

**Clerk 7.10 (checked in installed types and source)**

- `auth()` from `@clerk/nextjs/server` returns `{ userId, redirectToSignIn, ... }` in Server Components, Route Handlers, and Server Actions. It requires `clerkMiddleware`, which we have. `currentUser()` calls Clerk's rate-limited Backend API, and we only need `userId`.
- When the user is signed out, `auth.protect()` redirects page requests to sign-in, returns 401 for Server Action requests, and returns 404 for anything else (`dist/esm/server/protect.js`).
- `createRouteMatcher` is `@deprecated`: "Move auth checks into each page, layout, API route, or Server Function." That matches CLAUDE.md's rule that the proxy is never the authorization layer.

**Next.js 16.4 (from `node_modules/next/dist/docs/`)**

- A Server Action is a public POST endpoint. Every action must authenticate, authorize, validate, and return only what the UI needs (`02-guides/server-actions.md#security`).
- To show form errors, use a Client Component with `useActionState(action, initialState)`. The action's signature then becomes `(prevState, formData)`.
- `redirect()` throws `NEXT_REDIRECT`. Inside an action it does a client-side navigation, or a 303 without JS. `notFound()` throws a 404 fallback error. Both must be called outside `try/catch` (or rethrown with `unstable_rethrow`).
- Auth checks in a layout don't re-run on navigation and don't block child segments, so the checks belong in pages or the data layer. `params` is a Promise; type pages with `PageProps<"/events/[eventId]/manage">`.

**Prisma 7.10**

- `PrismaClient` requires `adapter` (or `accelerateUrl`). `new PrismaNeon({ connectionString })` uses a WebSocket pool and supports transactions; `PrismaNeonHttp` is the HTTP variant. Node 22+ has a global `WebSocket`, so we don't need the `ws` package.
- The CLI labels `prisma-client-js` "Legacy". The current generator is `prisma-client`, and the type docs import it from `./generated/prisma/client`. CLAUDE.md's `@/generated/prisma` import only works with the legacy generator.

## What's missing

- `src/generated/prisma` (never generated) and `prisma/migrations/` (this issue's migration will be the first).
- Models: `Event` (name, status, judgesPerTeam, scaleMin, scaleMax, timestamps), `Criterion` (eventId, name, weight, position), `EventMember` (eventId, userId, role, teamId?), and the enums `EventStatus` and `EventRole`.
- `src/server/`: `db.ts` (a singleton, so dev hot reloads don't create extra pools), `auth.ts` (`requireUser`, `requireEventRole`), `actions/events.ts`, `queries/events.ts`.
- `src/domain/`: nothing exists yet. This issue needs rubric validation and event settings with defaults.
- Routes: `events/new/page.tsx` plus a client form, `events/[eventId]/manage/page.tsx`, and `not-found.tsx`.
- Dependencies: `zod` 4.6.7 is installed only transitively (via eslint-plugin-react-hooks), so it isn't declared and could disappear. shadcn/ui isn't initialized (no `components.json`, no `src/components/ui`, no clsx/tailwind-merge/cva).
- Tooling: no `.github/` (no CI), no `tests/` or `tests/factories.ts`, no integration or Playwright setup, no logging convention.

## Constraints from CLAUDE.md

- Layers go `app → server → domain`. The rubric rules live in `src/domain`, which must not import Next, Prisma, Clerk, or `src/server`. Zod validation sits at the trust boundary in `src/server`.
- Action order: authenticate → authorize → Zod → domain → Prisma → DTO. Creating an event has no event to check a role against, so authorization here is just `requireUser()`. The manage page uses `requireEventRole(eventId, ["ORGANIZER"])`. Ad hoc role checks aren't allowed.
- Don't trust the `eventId` route param: validate it, and scope the query to the user's membership. Return DTOs, never raw Prisma objects.
- Expected failures are returned as values (`{ ok: false, error }`), which fits AC2. `redirect()` and `notFound()` are thrown control flow, so we need to decide how they fit that convention (Open question 9).
- Domain rules: weights are integers summing to 100, k defaults to 3, the scale defaults to 1–10, and a new event starts in `DRAFT`. Ask before changing any of these. Timestamps are stored in UTC.
- Strict TDD for domain and authorization rules: RED (stop for review) → GREEN → REFACTOR, one acceptance criterion at a time. Commits look like `feat(rubric): ... (#3) [RED]`, on a branch named `feat/3-<slug>` that is merged without squashing.
- Code: named exports (default exports only for page/layout), kebab-case file names, `@/` imports, no `any`, no `!`.
- UI: shadcn/ui and Tailwind with no new CSS files. Use Client Components only where needed; adding and removing criteria rows and showing errors need one.
- Before adding a dependency, ask. Update `.env.example` for any new variable. Before calling the work done, run `typecheck` (which now needs `db:generate` first), `lint`, and the tests.

Rules the repo can't satisfy yet:

- "Zod for every input": `zod` isn't a declared dependency.
- "shadcn/ui from `src/components/ui`": not initialized.
- Definition of Done says every action and query has a test showing unauthorized roles are rejected, against a real database. The integration harness is only planned.
- Definition of Done says "CI is green", but there is no CI workflow.
- Security headers in `next.config` and logging of authorization denials don't exist yet.

## Testability

| AC                 | Unit-testable now (Vitest, pure code)                                                                                                             | Needs planned tooling                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 create         | A domain builder that turns valid input into an event in `DRAFT` with ordered criteria                                                            | Integration: event, criteria, and `ORGANIZER` membership are saved in one transaction. E2E: redirect to `/manage`, which shows the name and rubric           |
| AC2 invalid rubric | Each rule: sum ≠ 100, weight not a positive integer, empty name, duplicate name, no criteria; the error names the rule. Zod parsing of `FormData` | Integration: nothing is saved. E2E: the message is shown                                                                                                     |
| AC3 defaults       | k = 3 and scale 1–10 when blank; k must be an integer ≥ 1; scale must be integers with min < max                                                  | Integration: the defaults are persisted                                                                                                                      |
| AC4 access         | Pure rule: the user holds `ORGANIZER` for this event (given memberships, no Clerk)                                                                | Integration: `requireEventRole` rejects JUDGE, TEAM, non-members, and other events' members. E2E: signed-out users go to sign-in; a non-organizer gets a 404 |

Actions that call `auth()` and `redirect()` need a request context. Integration tests will need a seam to inject the user (fake Clerk, real database). Vitest only runs `*.test.ts` in `node`, so testing the form component would need new dependencies.

## Open questions

1. Should we set up `test:integration` (a Neon test branch and `TEST_DATABASE_URL`) in #3, or ship unit tests plus manual checks and open a follow-up issue? Definition of Done requires the role-rejection test.
2. Can we add `zod` (v4) as a direct dependency and initialize shadcn/ui? shadcn adds clsx, tailwind-merge, cva, and Radix. The alternative is plain Tailwind for now.
3. Keep the legacy `prisma-client-js` generator (which matches CLAUDE.md), or switch to `prisma-client` (import from `@/generated/prisma/client` and update CLAUDE.md)?
4. Should the first migration hold only Event, Criterion, and EventMember, or the whole domain model? `EventMember.teamId` needs a `Team` table.
5. Should `EventMember.userId` store the Clerk user ID directly, with no `User` table? Organizers will need display names later.
6. Rubric details the acceptance criteria don't settle: Trim names? Treat duplicates case-insensitively? Limits on the number of criteria and on name lengths? Upper bounds on k and on the scale (can min be 0 or negative)? Should criteria keep the order they were entered in (`position`)?
7. AC2 "says which rule failed": report the first failure or all of them? Per row or for the whole form? Should the domain return error codes and the UI map them to messages?
8. A signed-out visitor on `/events/[eventId]/manage`: sign-in or 404? Should a nonexistent event return the same 404 as "not an organizer"? I recommend yes, to prevent ID enumeration.
9. How should `requireUser` handle a signed-out user: `auth.protect()` (redirect for pages, 401 for actions) or `auth()` plus `redirectToSignIn()`? Should `requireEventRole` throw `notFound()` or return a value?
10. Keep the proxy public and do every check in server code, as Clerk's deprecation suggests, or also add a signed-out redirect for `/events(.*)` in the proxy?
11. Which Neon branch does `db:migrate` target, and do we share it with Yunhong? What should the ID format be (cuid or uuid)? This affects the Zod param check.
12. Clerk's hosted Account Portal or local sign-in pages? Local pages need `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and related variables in `.env.example`.

Risks:

- A `try/catch` around `redirect()` or `notFound()` swallows them.
- If the event, criteria, and membership aren't saved in one nested create or `$transaction`, a failure can leave a partial save, which breaks AC2's "nothing saved". Use `PrismaNeon`, not the HTTP adapter.
- React 19 resets uncontrolled inputs after an action. Unless the form state is controlled or sent back, a validation error wipes the organizer's criteria.

## Files read

- `gh issue view 3`. CLAUDE.md and `docs/prd.md` were loaded into context automatically. I didn't open `.env` (the settings deny it).
- Repo: `package.json`, `prisma/schema.prisma`, `prisma.config.ts`, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `next.config.ts`, `vitest.config.mts`, `tsconfig.json`, `.env.example`, `eslint.config.mjs`, `README.md`, `.gitignore`, `.claude/settings.json`.
- Clerk (`node_modules/@clerk/nextjs/dist/`): `types/server/index.d.ts`, `types/app-router/server/auth.d.ts`, `types/server/protect.d.ts`, `types/app-router/server/currentUser.d.ts`, `types/server/routeMatcher.d.ts`, `esm/server/protect.js`.
- Next docs (`node_modules/next/dist/docs/01-app/`): `02-guides/forms.md`, `02-guides/server-actions.md` (Security, Cache, Config), `02-guides/authentication.md` (Authorization sections), `03-api-reference/04-functions/redirect.md`, `03-api-reference/04-functions/not-found.md`, `03-api-reference/03-file-conventions/proxy.md` (intro and headings).
- Prisma and Neon: `@prisma/adapter-neon/dist/index.d.ts`, `@prisma/client/package.json`, `@prisma/client/runtime/client.d.ts` (`PrismaClientOptions`), `@neondatabase/serverless/index.d.ts` (`webSocketConstructor`). I also searched `prisma/build/cli.js`, `prisma/build/index.js`, and `@prisma/client/runtime/client.js` for generator names and adapter checks, plus `package.json` versions of the installed packages.
