# HW4 Reflection

Ziqi Yang and Yunhong Huang. Ziqi did Part 1 and Part 2 (issue #3); Yunhong did Part 3 (issue #5), the second /init (issue #8), and this write-up. Evidence for every claim is linked in docs/hw4/session-log.md.

## 1. How does Explore → Plan → Implement → Commit compare to our previous approach?

**Before.** Ziqi's earlier AI-assisted workflow was intuitive and iterative: give the AI a requirement, let it write code at once, and paste errors back until things work. That is fast for isolated scripts but leads to rework once migrations, auth boundaries, or full-stack state are involved. Yunhong's earlier approach already started with a plan: she asked the AI for one and then built the project module by module, but she didn't write tests.

**Part 2 (Ziqi, issue #3).** Explore found things neither of us would have checked first: zod was only a transitive dependency, shadcn/ui wasn't set up, and five CLAUDE.md rules couldn't be met in the repo as it stood. It also produced 12 open questions, which Ziqi answered before any code was written. When Claude found an unexpected branch state, it stopped and asked instead of picking a fix. Plan mode turned the feature into four steps, each mapped to files, checks, and acceptance criteria. Writing the step 1 tests then exposed five edge cases the plan had missed, so the plan was revised (caea8db). That was the main lesson: the plan works best as a living contract, not a fixed spec. Implementation followed the rule "one step, then stop for review": after GREEN, format:check failed and Claude stopped instead of editing tests. The cost was real, roughly one to two extra hours, and the workflow didn't catch everything. A form bug (values cleared when submitting before hydration) slipped past the planned checks and was found by hand.

**Part 3 (Yunhong, issue #5).** TDD felt like E→P→I→C at the size of one acceptance criterion: the RED test is the plan, GREEN is the implementation, and each step is its own commit. What made it work was reviewing every RED before committing: it had to fail on an assertion, not on an import or type error, and Yunhong checked each expected value by hand. Two moments showed why that review matters. For AC3, Claude chose [7.15, 7.15, 7.15], where floating-point rounding leaves a standard deviation of about 8.9e-16 instead of 0. A `sd === 0` check fails that test; only the `max === min` rule in CLAUDE.md passes, so the test enforces the rule rather than just the happy path. For AC5, the fast-check properties passed on their first run, because shift and scale invariance follow from the z-score definition. Instead of faking a RED, Claude temporarily broke zScores, showed that both properties failed with shrunk counterexamples, and reverted the change; the commit says so. The design decisions (AC4's input type, AC6's tie order) stayed with Yunhong, and REFACTOR happened only once, when a real duplication appeared (4c60c19).

**What we would keep.** We would choose the workflow by blast radius and rollback cost: the full E→P→I→C or TDD loop for schema changes, auth boundaries, and domain rules, and a lighter loop for one-off scripts and styling.

**What the workflow didn't protect.** Both of us found that `ask` rules in .claude/settings.json don't override the permission mode. Yunhong's first Part 3 commit (a505add) went through in auto mode after approval in chat, with no confirmation prompt; a test in manual mode then showed the prompt working. In Ziqi's step 2, Ziqi's notes record approving db:migrate at the ask prompt, but Claude, which cannot see the dialog, noted that the session's system notes showed bypass-permissions mode. We added a CLAUDE.md lesson: check the mode before letting Claude commit.

## 2. Which context management strategies worked best?

**A separate test session.** This was the most valuable strategy. The implementation session's first explanation of the form bug was only half right, and Ziqi couldn't reproduce the second case by hand because the page hydrated too fast. A separate Claude Code session, working only from the acceptance criteria and a headless browser, reproduced both cases, then retested after the fix. A session without the implementation's assumptions acts like an independent tester.

**`/clear` between tasks, with state written down.** After Part 1, a fresh session still answered PRD user story 7 without opening a file, which confirmed that the @import in CLAUDE.md loads the PRD every time. Yunhong used `/clear` before starting TDD and again before the second /init. It was safe because the state lived in issues, commits, notes, and session exports, not in the conversation.

**`claude --continue` across days.** Part 3 ran over two days. After `--continue`, Claude first stated the last commit and the next acceptance criterion from the session, then checked them against git log, so the work picked up where it stopped.

**`/compact` with a stated purpose.** Before step 4, Ziqi exported the transcript and ran /compact, which cut context use from about 25% to 7%. With a 1M-token window this was about focus, not space: Claude recalled the committed steps and step 4's constraints without rereading files.

**What didn't work: assuming the session knows the repo.** Claude can't see what happens outside its session. After Yunhong deleted a stale export and pushed from a terminal, Claude still reported "two untracked exports" and "8 commits ahead". It later explained that it had relied on stale state, and from then on ran `git status -sb` before reporting. Ziqi saw the same problem from the other side: the first Explore wasn't handed off, so it had to be rerun the next day. Both cases point to one rule: anything the next session needs must be written down in a commit, a note, or an export, and changes made outside the session must be told to Claude.

**A limit of the evidence.** `/export` doesn't record permission dialogs. Where a prompt matters, the session log points to screenshots or to our timestamped notes.

_This reflection was drafted with Claude (claude.ai) from Ziqi's written answers, both partners' notes, and the session exports, then reviewed and edited by Yunhong._
