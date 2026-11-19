# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Fair-n-Square is a web app for fair judging at hackathons, demo days, and class showcases. It is a group class project. So far it is a scaffold: Next.js App Router, Clerk auth, and Prisma 7 on Neon Postgres, with no domain models or features yet. `docs/hw4/notes-<name>.md` files hold each team member's working notes for the assignment.

## Commands

```bash
npm run dev            # Next.js dev server (Turbopack) on http://localhost:3000
npm run build          # production build
npm run lint           # ESLint (flat config) over the repo; `npx eslint <path>` for one file
npm run typecheck      # `next typegen` then `tsc --noEmit`
npm run format         # Prettier write; `format:check` to verify only
npm test               # Vitest, single run (passes when no tests exist)
npm run test:watch     # Vitest watch mode
npx vitest run src/path/to/file.test.ts      # one test file
npx vitest run -t "test name"                # tests matching a name
npm run db:generate    # generate the Prisma client into src/generated/prisma
npm run db:migrate     # prisma migrate dev (uses DATABASE_URL_UNPOOLED)
```

Copy `.env.example` to `.env` and fill it in before running the app or Prisma commands.

## Versions are newer than most training data

Next.js 16, React 19.3, Clerk 7, Prisma 7, Tailwind 4, and Vitest 5. Their APIs differ from older versions you may remember. Next.js ships version-matched docs in `node_modules/next/dist/docs/`; check them, or the installed package's types, before relying on memory. Specific differences already in this repo:

- **Next.js 16 middleware lives in `src/proxy.ts`**, not `middleware.ts`. It currently runs `clerkMiddleware()` with no route protection, so every route is public until protection is added there or checked in server code.
- **Route prop types are generated globals.** `LayoutProps<"/">` and `PageProps<...>` come from `next typegen`, which is why `typecheck` runs it before `tsc`.
- **Clerk 7** uses `<Show when="signed-in">` / `<Show when="signed-out">` (see `src/app/layout.tsx`) instead of the older `<SignedIn>` / `<SignedOut>`.
- **Tailwind 4 runs through a Turbopack loader** (`@tailwindcss/turbopack` in `next.config.ts`). There is no PostCSS config. Theme tokens live in `@theme` in `src/app/globals.css`.

## Database (Prisma 7 + Neon)

- The datasource URL is set in `prisma.config.ts`, not in `schema.prisma`, as Prisma 7 requires. The CLI (migrations) uses the direct connection `DATABASE_URL_UNPOOLED`.
- At runtime the app should use the pooled `DATABASE_URL` through `@prisma/adapter-neon`. No shared client module exists yet; when one is added, use the Neon adapter with `DATABASE_URL`.
- The client is generated to `src/generated/prisma/`. That folder is gitignored and has no postinstall hook, so run `npm run db:generate` after a fresh clone or a schema change, before code that imports the client will typecheck or build. Import it from `@/generated/prisma`, not `@prisma/client`.

## Testing

Vitest only picks up `src/**/*.test.ts`, in the `node` environment. `.tsx` tests and DOM/component tests would need `vitest.config.mts` changed first. `fast-check` is installed for property-based tests. The `@/*` alias maps to `src/*` in both tsconfig and Vitest.

## Conventions

- Prettier with default settings (`.prettierrc.json` is `{}`). Line endings are forced to LF by `.gitattributes`.
- Commits use Conventional Commit prefixes (`chore:`, `docs(hw4):`), and branches use matching names (e.g. `chore/claude-md`).
