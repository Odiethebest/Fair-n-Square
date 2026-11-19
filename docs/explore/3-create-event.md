# Explore: #3 Organizer creates an event with a weighted rubric

Date: 2026-11-18 · Branch: `feat/3-create-event` · Phase: Explore (read-only)

## Summary

The repo is a create-next-app scaffold with Clerk wired in and a Prisma schema with no models. Everything #3 needs is missing:
models, migrations, `src/domain`, `src/server`, shadcn/ui, and both routes. The rubric and settings rules (AC2, AC3) are pure
and can be built test-first now. Persistence, the redirect, and access control (AC1, AC4) need integration or E2E tooling that
is still only planned. Decide the generator, schema scope, dependencies, error shapes, and the authorization-test approach
before planning.

## What exists

- **App:** `src/app/layout.tsx` wraps everything in `<ClerkProvider>`, with a header using `<Show when="signed-out|signed-in">`.
  `page.tsx` is the create-next-app placeholder. There is no `not-found.tsx`.
- **Proxy:** `src/proxy.ts` is a bare `clerkMiddleware()`. Its matcher skips `_next` and static files and always runs for `/api`
  and `/__clerk`. It only attaches auth state, so every route is public. Server Actions are POSTs to their page's route, so
  they pass through the same matcher.
- **Clerk 7.10.4** (`@clerk/nextjs/server`):
  - `auth()` returns `userId: string | null` plus `redirectToSignIn()`.
  - `auth.protect()` redirects document requests to sign-in when signed out, but returns **404 for non-document requests**.
  - `currentUser()` calls the Backend API, which is rate-limited.
  - `createRouteMatcher` is **deprecated** in favour of checks in each page or Server Function, which matches CLAUDE.md.
  - There's no `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, so sign-in uses the hosted Account Portal.
- **Next.js 16.4.6 docs:**
  - Every `'use server'` action is a public POST. Authenticate, authorize, and validate inside it (a page-level check doesn't
    cover it). Return DTOs. There's a built-in CSRF Origin check and a 1 MB body limit.
  - **Forms:** `useActionState(action, init)` gives `[state, formAction, pending]`, and the action's signature becomes
    `(prevState, formData)`. Showing errors requires a Client Component for the form.
  - **`redirect()`:** throws `NEXT_REDIRECT`, so call it outside `try/catch` and after `revalidatePath`. It defaults to `push` in
    actions and returns 303 for no-JS posts.
  - **`notFound()`:** throws, and must run on the render path. A `try/catch` swallows it unless `unstable_rethrow` is used.
    `unauthorized()`/`forbidden()` need the experimental `authInterrupts` flag, so `notFound()` fits AC4.
  - The docs recommend a `server-only` DAL that returns DTOs; Next handles `import 'server-only'` without the package.
- **Prisma 7.10.1:**
  - `prisma.config.ts` points the CLI at `DATABASE_URL_UNPOOLED`.
  - `schema.prisma` has a `postgresql` datasource with no URL and **no models**. Its generator is `prisma-client-js`, with output
    to `src/generated/prisma`; the installed CLI labels this generator **"Legacy"** (the current one is `prisma-client`).
  - `PrismaClient` **requires** `adapter` or `accelerateUrl`. `@prisma/adapter-neon` exports `new PrismaNeon({ connectionString })`
    (a WebSocket pool that supports transactions); Node 26 locally and Node 24 on Vercel have a global `WebSocket`.
  - No migrations exist, and `src/generated/` hasn't been generated.
- **Tooling:** Vitest only picks up `src/**/*.test.ts` in the `node` environment (no DOM or `.tsx` tests). fast-check 4.10.3 is
  installed. The ESLint config ignores `src/generated/**`. `tsconfig` has strict mode and `@/*` alias.
- **Styling:** Tailwind 4 in `globals.css` with a minimal `@theme inline`.

## What's missing

- **Prisma models:** `Event`, `Criterion`, `EventMember`, and enums `EventStatus` and `Role`, plus the first migration.
- **`src/server/db.ts`:** a `PrismaNeon` + `PrismaClient` singleton, cached on `globalThis` in dev.
- **`src/server/auth.ts`:** `requireUser()` and `requireEventRole(eventId, roles)`.
- **`src/server/actions/events.ts`** (`createEvent`) and **`src/server/queries/events.ts`** (the manage-page DTO).
- **`src/domain/`:** rubric and event-settings validation with their tests.
- **Routes:** `src/app/events/new/page.tsx` plus a client form, and `src/app/events/[eventId]/manage/page.tsx`.
- **Dependencies:** `zod` is **not in package.json**; 4.6.7 is installed only through `eslint-plugin-react-hooks`.
  **shadcn/ui is not initialized** (no `components.json`, `src/components/ui`, `clsx`, or `tailwind-merge`).
- **Testing:** no integration tests, Playwright, `tests/factories.ts`, or `TEST_DATABASE_URL`.

## Constraints from CLAUDE.md

- **Layers:** `app → server → domain`. The domain has no Next, Prisma, or Clerk imports and no `Date.now()` or `Math.random()`.
  The rubric rules go in the domain before any UI: sum = 100, positive integer weights, unique non-empty names, at least one
  criterion, k ≥ 1, and integer min < max.
- **Action order:** authenticate → authorize → Zod → domain → Prisma → DTO. Expected failures are `{ ok: false, error }`.
  Throw only for programmer errors. Never trust a client-sent `eventId` or role.
- **Authorization:** use `requireUser()` and `requireEventRole()` only, with no ad hoc checks. Proxy is not the authorization
  layer. Log denials without secrets or personal data.
- **Conventions:** no `any` and no `!`. Use named exports, `@/` imports, and kebab-case files. Import the client from
  `@/generated/prisma`. Return DTOs, store timestamps in UTC, and use shadcn/ui and Tailwind with no new CSS.
- **Do/Don't:** ask before adding a dependency. Update `.env.example` for new variables. Never read `.env`. Never run
  `migrate reset`. Ask when an acceptance criterion is ambiguous.
- **TDD and DoD:**
  - Strict RED → review stop → GREEN → REFACTOR for domain and authorization rules, one acceptance criterion at a time.
  - Commits are tagged `[RED]`/`[GREEN]`/`[REFACTOR]` with `(#3)`.
  - Every new action or query needs a test showing that unauthorized roles are rejected.
  - Run typecheck, lint, and tests before calling it done.
  - The PR needs AI disclosure and a C.L.E.A.R. review, and is merged with a merge commit.

## Testability

| AC           | Unit-testable now (Vitest, `src/domain`)                                                 | Needs planned tooling                                                              |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| AC1 create   | A pure function that builds the draft (status `DRAFT`, criteria, creator as `ORGANIZER`) | Saving, membership, redirect, and the manage page: integration + E2E               |
| AC2 invalid  | One error code per rule, plus fast-check properties                                      | "Nothing saved": integration; message shown in the form: E2E                       |
| AC3 defaults | Defaults k = 3 and scale 1–10; the k and scale rules                                     | None, if Zod parsing of blank (`""`) fields sits in a plain `.ts`                  |
| AC4 access   | A pure "member holds one of these roles" decision                                        | `requireEventRole` against the DB: integration; sign-in redirect and 404 page: E2E |

## Open questions

1. **Generator:** keep the legacy `prisma-client-js`, or switch to `prisma-client`? Switching changes the import to
   `@/generated/prisma/client` and requires a CLAUDE.md edit.
2. **Schema scope:** add only `Event`, `Criterion`, and `EventMember`, or the full model? `EventMember.teamId` needs `Team`, or a
   nullable column for now.
3. **User identity:** store the Clerk `userId` string in `EventMember`, or add a `User` table?
4. **Dependencies:** approve `zod` as a direct dependency? Initialize shadcn/ui now (it adds `clsx`, `tailwind-merge`, Radix,
   and more), or use plain Tailwind for this issue?
5. **Rubric details:** trim names? Compare duplicates case-insensitively? Maximum name lengths and criterion count? Weights
   limited to 1–100? Keep the entered order (a `position` column)? Report all failing rules, or only the first?
6. **Scale and k:** can min be ≤ 0? Is there an upper bound on k or on the scale range?
7. **AC4 gaps:**
   - For a signed-out visitor on `/manage`: sign-in redirect or 404?
   - For a signed-out POST to `createEvent`: an error value or a redirect?
   - Can any signed-in user create an event?
   - Hosted Account Portal, or an in-app `/sign-in`?
8. **`requireEventRole` contract:** return `{ ok: false }` and let pages call `notFound()`, or throw? Rule 5 says to return values.
9. **Authorization tests:** set up integration tests now (`TEST_DATABASE_URL` on a separate Neon branch) to meet the DoD, or
   unit-test the pure decision and defer the DB test?
10. **Migration:** OK to run `npm run db:migrate -- --name init` against the dev Neon database?

**Risks:**

- `auth.protect()` returns 404 to signed-out non-document requests. Calling `auth()` and `redirectToSignIn()` explicitly in
  pages makes the behaviour predictable.
- A `try/catch` around `redirect()` or `notFound()` silently breaks both.
- Without a `globalThis` client cache, dev hot reloads open new Neon pools.
- The event, criteria, and organizer membership must be written in one atomic nested create.
- Without integration or E2E tests, AC1 and AC4 rely on manual checks.

## Files read

- **Project:** `CLAUDE.md`, `docs/prd.md` (auto-loaded), `README.md`, `package.json`, `.env.example`, `.gitignore`,
  `.claude/settings.json`, `next.config.ts`, `prisma.config.ts`, `prisma/schema.prisma`, `tsconfig.json`, `vitest.config.mts`,
  `eslint.config.mjs`, `src/proxy.ts`, `src/app/{layout.tsx,page.tsx,globals.css}`. Issue #3 through `gh issue view 3`.
- **Clerk** (`node_modules/@clerk/nextjs/dist/types/`): `server/{index,protect,clerkMiddleware,routeMatcher}.d.ts`,
  `app-router/server/{auth,currentUser}.d.ts`.
- **Next** (`node_modules/next/dist/docs/01-app/`): `02-guides/server-actions.md`, `02-guides/forms.md` (validation section),
  `02-guides/data-security.md` (DAL and mutation sections), `03-api-reference/04-functions/{redirect,not-found}.md`,
  `03-api-reference/03-file-conventions/proxy.md` (grep only).
- **Prisma:** `@prisma/adapter-neon/{package.json,dist/index.d.ts}`, `@prisma/client/package.json`,
  `@prisma/client/runtime/client.d.ts` (constructor options), `prisma/build/cli.js` (grep only). Versions came from each
  package's `package.json`, plus `npm ls zod`.
- **Not opened:** `.env` (denied by policy), `docs/hw4/**`.
