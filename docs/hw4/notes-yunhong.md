# Yunhong's HW4 notes

## 2026-11-18 ~21:45 — Clone and repo state check

- Cloned to F:\projects\Fair-n-Square (Windows + Git Bash).
- My first copy of `git log` missed the top lines, so it looked like PR #1, def2a63, and PR #2 were missing from main. Re-ran `git log --oneline -8`: main is at 0233fbc (PR #2) and includes c717695 (PR #1) and def2a63 (permissions). `.claude/settings.json` is present.
- Lesson: check the full output before raising an alarm.

## 2026-11-18 ~21:48 — Launching Claude Code on Windows

- `claude` in Git Bash (mintty) didn't start interactively: "no stdin data received" and "Input must be provided ... when using --print". Switched to PowerShell, where it started normally (Claude Code v2.1.326, Opus 5.5).
- Startup warning: "Ignoring 11 permissions.allow entries from .claude/settings.json: this workspace has not been trusted." Accepted the trust dialog in an interactive session; `/permissions` then listed the allow rules (git add/diff/log/show/status, npm test, etc.). A freshly cloned repo can't approve its own permissions until the folder is trusted.
- Startup warning: my Claude Code sign-in expires between 2026-11-20 and 2026-11-23, and auto-renewal doesn't extend it. Plan: run `claude auth login` before 11/20.

## 2026-11-18 ~21:54 — Dependencies and env

- `npm ci`: added 533 packages, 0 vulnerabilities. An EPERM cleanup warning on a node_modules temp folder (likely a file lock on Windows) didn't affect the install.
- Ignored the npm 12 upgrade notice; not changing tools mid-assignment.
- `cp .env.example .env` (placeholder values). Did it myself because settings.json denies Claude read/write access to `.env`.
- Ziqi offered the real .env. Decided not to use it: Part 3 is pure domain code with no database or Clerk, and real secrets on disk add leak risk (deny rules don't cover `cat .env` through Bash, and session exports go into a public repo). Kept it outside the repo.

## 2026-11-18 21:59 — Clean clone check (Windows, PowerShell + Claude Code)

- db:generate, typecheck, lint: pass. format:check: fail.
- npm test: pass with 0 tests (--passWithNoTests); git status: clean, up to date with origin/main.
- Cause: 3 committed session exports in docs/hw4/sessions/ aren't Prettier-formatted.
- Claude stopped on failure as instructed and proposed two fixes without changing files.
- When I asked it to continue, Claude pointed out that `npm test` passing meant nothing yet, since there are no test files. It didn't treat "no tests" as "tests pass".
- Decision: add docs/hw4/sessions/ to .prettierignore (exports are evidence; keep them verbatim). Do it as the first commit on the Part 3 branch. (Superseded on 11-19; see below.)
- Claude also noted the commit order: the .prettierignore change must land before any new session export is committed, so every commit passes format:check.
- Also learned: Claude Code didn't start interactively in Git Bash (mintty); used PowerShell instead. Workspace trust had to be accepted before settings.json allow rules applied.

## 2026-11-18 ~22:50 — Wrap-up

- Exported the session to docs/hw4/sessions/2026-11-18-yunhong-clean-clone-check.md (re-exported after later turns so it's complete). Not committed yet; it goes in with the Part 3 branch.
- Claude Code installed an update during the session; restart and record the new version next time.
- I accidentally pasted my notes into Claude Code instead of the notes file. Claude recognized them as a log entry and changed nothing until I gave an explicit instruction.
- Sent Ziqi the three Domain rules to confirm before starting TDD.

## 2026-11-19 — Domain rules confirmed; prettierignore fixed on main

- Ziqi confirmed all three rules: zero spread = max === min (my CLAUDE.md commit on the Part 3 branch); AC5 ranges a in [0.1, 10], b in [-100, 100], tolerance 1e-9; rubric.ts is Ziqi's, scoring.ts and its tests are mine, each defines its own input types.
- Ziqi added docs/hw4/sessions/ and docs/plans/ to .prettierignore on main: commit 0fb7418 (10:43 PT per `git show`), merged as PR #4 (7fdad46). Reason: `npm run format` is allowed without a prompt, so Claude could rewrite session exports. The Part 3 branch no longer needs its own prettierignore commit.
- The commit message credits the issue to my clean-clone check ("Found by Yunhong on a clean clone").

## 2026-11-19 — Sign-in renewed

- Ran `claude auth login` before the 11-20 expiry window.

## 2026-11-19 — CLAUDE.md zero-spread rule (a505add)

- Created feat/5-scoring from main after PR #4 (7fdad46).
- Claude changed one line in the Normalization rule of CLAUDE.md: if all of a judge's submitted weighted scores are equal (max === min, including a single submission), all of that judge's z-scores are 0, checked by equality rather than standard deviation === 0.
- Commit a505add `docs(claude): define zero spread as all-equal scores (#5)`, with a Co-Authored-By: Claude trailer. Kept the trailer as an honest record of AI involvement.
- The session was in auto mode when Claude committed. I had approved in the chat ("Approved. Commit it."), and the session export shows that, but no confirmation prompt appeared. Not amending or redoing the commit; recording it as it happened.
- Lesson: the settings.json `ask` rules and the permission mode are separate layers. In auto mode, an `ask` rule doesn't necessarily stop a commit. From now on I check the status bar before every commit.
- Switched back to manual mode and tested it: asked Claude to run `git commit --allow-empty`. A confirmation prompt appeared, I declined, and no extra commit was created.
- Exported the session to docs/hw4/sessions/2026-11-19-yunhong-part3-claude-md-rule.md, then ran `/clear` before starting TDD: new task, and the state lives in CLAUDE.md, issue #5, and the commits.

## 2026-11-19 — Pre-commit checks and HW4 brief cross-check

- `git merge-base --is-ancestor origin/main HEAD`: OK. The branch already includes 0fb7418, so no merge is needed.
- Compared our plan with the HW4 brief on Canvas. Context management (/clear, /compact, --continue) and iterating on /init output are graded under Part 1, so my Part 3 sessions are Part 1 evidence too. The brief asks for red-green-refactor commits, so after every GREEN I check for a real code smell and note it when I skip REFACTOR.
- Sent Ziqi 5 questions: Part 2 status, /init evidence, her points for reflection question 1, whether I can merge the PR, and whether fast-check is in package.json. Waiting for her reply.
