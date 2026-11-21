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
- Exported the session to docs/hw4/sessions/2026-11-19-yunhong-part3-claude-md-rule.md, then ran `/clear` before starting TDD: new task, and the state lives in CLAUDE.md, issue #5, and the commits.
- In the new session, still before TDD, I tested manual mode: I asked Claude to run `git commit --allow-empty`. A confirmation prompt appeared and I declined; the export shows the call as "Interrupted" (2026-11-19-yunhong-part3-ac1-ac4.md, lines 8–13), and no extra commit was created. I had first written this test as happening before the export; the session-log search showed the real order, so I corrected it here.

## 2026-11-19 — Pre-commit checks and HW4 brief cross-check

- `git merge-base --is-ancestor origin/main HEAD`: OK. The branch already includes 0fb7418, so no merge is needed.
- Compared our plan with the HW4 brief on Canvas. Context management (/clear, /compact, --continue) and iterating on /init output are graded under Part 1, so my Part 3 sessions are Part 1 evidence too. The brief asks for red-green-refactor commits, so after every GREEN I check for a real code smell and note it when I skip REFACTOR.
- Sent Ziqi 5 questions: Part 2 status, /init evidence, his points for reflection question 1, whether I can merge the PR, and whether fast-check is in package.json.
- Answered the same evening by the handoff from Ziqi's coach: Part 2 is merged (PR #6, a5da298); /init evidence is fbdf592; branch protection needs 0 approvals, so I can merge my own PR; fast-check ^4.10.3 is already installed; Ziqi will send his answers for reflection question 1. The second /init and Part 4 were reassigned to me.

## 2026-11-19 evening — AC1 and AC2 (TDD)

- AC1 RED 25ec943 (13:52) and GREEN d0cf13e. Confirmation prompt on the GREEN commit: yes. On the RED commit: not recorded at the time.
- AC1: no REFACTOR. The implementation is a single reduce expression with no duplication or smell.
- During AC1 GREEN, Claude noticed its new line was 83 characters (Prettier's limit is 80), ran `prettier --write` on scoring.ts only, and told me about the change.
- Merged main early (b3ac73e) to surface conflicts with Part 2 before the PR. No conflicts; CLAUDE.md auto-merged. 77 tests pass (scoring 4, rubric 41, event-access 6, create-event-form 26). fast-check ^4.10.3 is already a dependency, so AC5 needs no new package.
- AC2 RED 4abdf61, GREEN 3f7daaa. Asked Claude to make the stub return zeros of the same length, so the RED failures are assertion failures rather than matcher type errors. Checked all expected values by hand; the [2, 4, 4, 4, 5, 5, 7, 9] case separates population SD from sample SD, and the unsorted [7.8, 5.2, 6.5] case catches an implementation that sorts.
- AC2 GREEN: told Claude not to special-case zero spread, so AC3 can get a real RED. No REFACTOR: the mean was computed in only one place.
- Mistake: typed `git status --short` while `less` was still open; less saved the diff to a file named `tatus --short`. Deleted it: yes. Lesson: use `git --no-pager diff`.

## 2026-11-19 late evening — AC3, AC4, and the first REFACTOR

- AC3 RED abbf881, GREEN 9bc1b0a. Besides [5, 5, 5] and a single submission, the RED tests include [7.15, 7.15, 7.15]: in floating point the naive population SD is about 8.9e-16, not 0, so the code returned -1 for each score. A `sd === 0` guard would still fail this test; only `max === min` passes. GREEN uses strict `max === min` on the scores, with no epsilon.
- Claude said two session exports were untracked; there was only one (I had deleted the stale one outside the session). Claude doesn't see changes I make in Git Bash unless I tell it.
- AC4 design decided by me: Assignment = { judgeId, teamId, weightedScore: number | null }; teamScores returns a Map; unsubmitted teams are absent. The test includes a null for D on J3's assignments; Claude's comment notes that treating null as 0 would change team A's score from -0.5 to 0. RED 4a467ec, GREEN 887f1ef.
- REFACTOR 4c60c19: "sum then divide by length" appeared in the judge mean, the variance, and the team mean, so I extracted a non-exported mean helper. 11 tests still pass. Claude noted the arithmetic order is unchanged, so the results are identical, not just close.
- Exported the session to docs/hw4/sessions/2026-11-19-yunhong-part3-ac1-ac4.md and deleted the earlier partial exports, which were never committed. Then ran `/exit`.

## 2026-11-20 — Resumed with --continue

- Ran `claude --continue` in PowerShell. Claude stated the last commit and the next AC from the session, then checked them against git log. (Screenshot saved.)
- Found that the previous night's push had not gone through: the branch was 3 commits ahead (AC4 RED, AC4 GREEN, REFACTOR). Committed the notes and the AC1-AC4 export (4726d3c) and pushed everything. Lesson: check `git status -sb` after every push.
- Claude also flagged that the three earlier partial exports were gone and asked whether that was intended. It was: they were never committed and are contained in the AC1-AC4 export.

## 2026-11-20 — AC5 and AC6

- AC5 614bfe6: the fast-check properties passed on their first run, because shift and scale invariance follow from the AC2/AC3 z-score definition. Committed without a [RED] tag and explained why in the commit body. To show the tests can fail, Claude temporarily made zScores return raw scores: both properties failed, and fast-check shrank them to minimal counterexamples (one score of 1 shifted by about -1e-9; one score of 1 scaled by 0.1). Then it restored scoring.ts, and `git diff --exit-code` confirmed no change.
- Generator: weighted scores are integers in [100, 1000] divided by 100, which is exactly the set of values Σ(weight × score)/100 can take with integer weights summing to 100 and scores 1-10.
- AC6 design decided by me: rankTeams takes { teamId, score, meanWeightedScore } and returns { teamId, rank } in rank order; fully tied teams share a rank and are listed by teamId ascending, so the same input gives the same output. Computing meanWeightedScore is not covered by any AC; noted as follow-up work.
- AC6 RED c7dc640: case (e), empty input, passed with the stub, as expected. GREEN 3b31a2f: copies the input before sorting, compares teamId with plain < and > (not localeCompare), and keeps 1e-9 in a named constant. All 18 scoring tests pass.
- No REFACTOR after AC6: the tolerance check is already one helper, and nothing is duplicated.
- Known limitation that Claude raised without being asked: "equal within 1e-9" is not transitive (0, 0.7e-9, 1.4e-9), so in such a chain the order could depend on input order. Not fixed, because the AC specifies this rule and real z-scores are not that close. Recorded for the PR.
- Final checks after 3b31a2f: 91 tests pass (scoring 18, rubric 41, event-access 6, create-event-form 26); typecheck, lint, and format:check pass; branch in sync with origin. Claude had said the branch was 8 commits ahead; it was actually in sync, because I had pushed from Git Bash, outside its session.
- Ziqi sent his reflection points for both questions on 11/20.

## 2026-11-20 — PR #7 and the second /init

- Before opening PR #7: main had no new commits since my merge; `npm run build` passes with the placeholder .env; `npm audit --omit=dev` reports 3 high-severity issues from one advisory (effect <=3.22.0 through prisma → @prisma/config), and the only fix is a breaking downgrade to Prisma 6, so it isn't addressed here.
- PR #7 merged as 00afc57 with a merge commit (the only merge method the repo offers). "Closes #5" closed the issue, and I ticked all six AC checkboxes.
- Exported the rest of the Part 3 session as 2026-11-20-yunhong-part3-wrapup.md. It includes Claude admitting the "8 commits ahead" claim was based on stale state.
- Opened issue #8 for the second /init, so the setup work has an issue to reference. Branch: chore/8-init-lessons.
- Ran `/clear` before `/init`: new task, and the Part 3 state lives in commits, notes, and exports. The `/clear` help text says the previous session stays on disk and can be resumed with `/resume`. Claude Code is now v2.1.328 after the pending update.
- `/init` read the code through three read-only Bash commands: package.json, the tracked files, and other agents' config files; the server and domain files plus `gh issue view 8`; and a grep over both notes files for lesson candidates. For the approval prompt I was shown, I chose "Yes", not "don't ask again" or "switch to auto mode", even though the prompt suggested auto mode. I first wrote "one chained command"; Claude pointed out the mistake before I committed, and I fixed it here instead of amending.
- `/init` did not edit CLAUDE.md. It listed eight fixes and additions plus Lessons learned candidates. I applied all eight. For the lessons, I replaced `npm run format` (it formats the whole repo and runs without a prompt) with `npx prettier --write <file>`, kept the Glob/Grep entry it proposed to drop, and added four it missed. It also missed that shadcn/ui isn't installed even though CLAUDE.md says the UI uses it; one of the new lessons covers that. Commit 315a138.
- My Part 3 session exports contain no Glob or Grep tool calls; Claude searched through Bash.
