# Fair-n-Square: Product Requirements

Source: the finalized Project 3 proposal (Ziqi, Yunhong). CLAUDE.md imports this file into every session, so keep it short.

## Problem

Hackathons and demo days ask a few judges to score dozens of teams in an hour or two. Assignments are made by hand, so some teams see four judges and others see one. Some judges even get a coworker's team. Judges also grade on different scales: one judge's 6 is another's 9, so a team that draws strict judges can lose to a weaker project. Awards wait on a spreadsheet tally, and the judges' notes rarely reach the teams.

## Target users

Organizers of hackathons, demo days, and class showcases with 10 to 60 teams; judges who score on their phones; and teams who want results and feedback.

## User stories

1. As an organizer, I want to create an event with a weighted rubric, so every judge scores the same criteria.
2. As a team member, I want to join with an invite link and add our project details, so judges know what they're scoring.
3. As a judge, I want to flag conflicts of interest, so I'm never assigned a team I shouldn't score.
4. As an organizer, I want judges assigned automatically, so every team gets equal coverage and no judge is overloaded.
5. As a judge, I want my assigned teams and a quick rubric form on my phone, so I can score and comment between tables.
6. As an organizer, I want a live progress board that flags missing or unusual scores, so I can act before judging closes.
7. As an organizer, I want rankings that normalize each judge's scores, so winners don't depend on which judges a team drew.
8. As a team member, I want to see our scores and judges' comments after release, so we know what to improve.

## If time allows

AI-drafted team feedback from judges' notes (Claude Agent SDK) and a full-screen awards reveal.

## Out of scope

Registration, ticketing, team formation, payments, and video streaming.

## Planned tech stack

Next.js and TypeScript, Tailwind CSS, PostgreSQL on Neon with Prisma, Clerk with per-event roles, Vitest, fast-check, Stryker, Playwright, GitHub Actions, and Vercel.
