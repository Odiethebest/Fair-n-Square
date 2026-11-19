# Ziqi working notes

- 2026-11-18 20:37 - scaffold: create-next-app, Prettier, Vitest
- 2026-11-18 20:54 - 1b: Prisma 7 + Neon, Clerk sign-in verified; first commit
- 2026-11-18 20:58 - step 2: branch chore/claude-md, starting /init
- 2026-11-18 21:02 - step 3: /init session stopped instead of inventing content when the draft file was missing
- 2026-11-18 21:07 - step 3 done (e197876). Lesson candidate: CLAUDE.md requires an issue number, but setup work has no issue
- 2026-11-18 21:16 - step 5: permissions on chore/permissions (removed temporary settings.local.json)
- 2026-11-18 21:27 - Part 1 steps 1-5 done (PR #1, PR #2). Created Part 2 issue.
- 2026-11-19 10:43 - Lesson candidate: session exports broke format:check; npm run format could rewrite evidence. Fixed via .prettierignore
- 2026-11-19 12:54 - Explore done. No Glob/Grep tools on native macOS build 2.1.325 (removed in 2.1.117); Claude used Read + read-only shell search and said so. Lesson candidate.
- 2026-11-19 13:11 - Claude stopped when it found an existing feat/3-create-event branch and a commit on local main, and asked instead of picking. Fixed branches by hand.
- 2026-11-19 13:34 - GREEN passed (47/47). format:check failed on rubric.test.ts; Claude stopped instead of editing a test. Ziqi ran Prettier on it; verified only whitespace and two trailing commas changed. Lesson candidate: format test files before RED review.
- 2026-11-19 13:39 - step 2: migration create_event_rubric applied to Neon; Claude ran npm run db:migrate after I approved it at the ask prompt. migration.sql reviewed: only CREATE, no DROP.
- 2026-11-19 13:45 - step 3 manual checks passed (307 signed out; same 404 for malformed and nonexistent IDs; no userId in logs). Saved to docs/hw4/part2-manual-checks.md.
- 2026-11-19 13:53 - /compact before step 4: context held two Explore passes, the plan, and steps 1-3 with tool output; step 4 only needs the plan, decisions, and paths. Exported first so the full transcript survives. /context screenshots before and after.
- 2026-11-19 14:13 - Manual check: AC1 pass (/events/cmwo3latw00002j8wmz3b0ldw/manage). AC2 partial fail: errors shown next to fields and page stays, but entered values are cleared after the error. Claude had flagged this as unverified. Fixing before commit.
