/** Everything the example workspace contains, in one place. */

export const ORGANIZATION = "Feedback Board Team";
export const REPO = {
  name: "feedback-board",
  cloneUrl: "https://github.com/halfleaf-ai/feedback-board.git",
  repoUrl: "https://github.com/halfleaf-ai/feedback-board",
  defaultBranch: "main",
};

const REPO_NOTE = `The team's repository is ${REPO.repoUrl} (clone ${REPO.cloneUrl}, branch ${REPO.defaultBranch}).`;

export const MATES = [
  {
    slug: "repo-analyst",
    name: "Repo Analyst",
    description: "Reads the Feedback Board codebase and explains how a behavior is implemented before anyone changes it.",
    instructions: `You are the Feedback Board team's repository analyst. ${REPO_NOTE}
Before answering, clone the repository and read the code involved. Cite files and line numbers.
Reproduce a reported bug with a failing test or a command before explaining its cause.
Never change code yourself; hand a confirmed root cause and a proposed fix to the person who asked.`,
  },
  {
    slug: "test-engineer",
    name: "Test Engineer",
    description: "Writes focused Vitest tests for Feedback Board and fixes bugs test-first.",
    instructions: `You are the Feedback Board team's test engineer. ${REPO_NOTE}
Work test-first: write a test that fails for the reported behavior, then the smallest change that makes it pass.
Tests use an in-memory database and an injected clock, as the existing tests in server/*.test.ts do.
Run npm test and npm run typecheck before you report, and include their output.`,
  },
  {
    slug: "release-writer",
    name: "Release Writer",
    description: "Turns merged changes and the weekly digest into release notes and customer updates.",
    instructions: `You write Feedback Board's release notes and customer updates. ${REPO_NOTE}
Write for customers, not engineers: what changed for them, in plain English, one line per change.
Credit the customer who asked for a change when the feedback names one. Never promise dates.`,
  },
  {
    slug: "project-steward",
    name: "Project Steward",
    description: "Keeps the Feedback Board project's items, risks and decisions current.",
    instructions: `You maintain the Feedback Board project in Symora. ${REPO_NOTE}
Keep items short and factual, link evidence (issues, pull requests, sessions) and record decisions with their reason.
Flag work that has no owner or has not moved for a week.`,
  },
] as const;

export const KNOWLEDGE = {
  slug: "feedback-board-handbook",
  name: "Feedback Board Handbook",
  description: "Product rules, architecture decisions and the release process for Feedback Board.",
  pages: [
    {
      path: "product/triage-rules.md",
      description: "How feedback is triaged and prioritized",
      content: `# Triage rules

- New feedback is triaged within two working days.
- Priority comes from \`priorityScore\`: votes weighted by tier (free 1, team 2, enterprise 4) plus up to four weeks of waiting time.
- Only \`new\` and \`triaged\` feedback carries a priority; planned, done and declined feedback scores zero.
- Every triaged item has an owner. Unassigned triaged items are listed in the weekly digest.
- Tags are case-insensitive: "Billing" and "billing" are the same tag.`,
    },
    {
      path: "product/weekly-digest.md",
      description: "What the weekly digest contains and when it is published",
      content: `# Weekly digest

The digest covers one week, Monday 00:00 to the next Monday 00:00, in the team's time zone.
It is published every Sunday at 18:00 and covers the week that is ending.

It lists: feedback received, how many still need an owner, the five highest-priority requests and the five most used tags.`,
    },
    {
      path: "engineering/architecture-decisions.md",
      description: "Architecture decisions and their reasons",
      content: `# Architecture decisions

## SQLite through node:sqlite, no ORM
The data set is small and relational. Plain SQL in FeedbackStore keeps every query reviewable. Rejected: Prisma (generated client, migration tooling heavier than the app).

## Priority is computed on read
The score depends on the current time, so storing it would go stale. Rejected: a nightly job recomputing a stored column.

## The web app imports server types
One repository, one TypeScript project; a generated client would be a second source of truth.`,
    },
    {
      path: "engineering/release-process.md",
      description: "How a change reaches customers",
      content: `# Release process

1. Every change lands through a pull request with a test that fails without it.
2. \`npm test\` and \`npm run typecheck\` pass in CI.
3. The release writer drafts customer-facing notes from merged pull requests.
4. A person approves the notes before they are published.`,
    },
  ],
};

export const MEMORY = [
  {
    title: "Fix bugs test-first",
    content: "Every bug fix starts with a test that fails for the reported behavior and lands in the same pull request as the fix.",
    level: "convention",
    kind: "decision",
  },
  {
    title: "Weeks run Monday to Monday",
    content: "Digests, metrics and reports use weeks from Monday 00:00 to the next Monday 00:00 in the team's time zone.",
    level: "rule",
    kind: "fact",
  },
  {
    title: "Customer names in release notes",
    content: "Release notes credit the customer who requested a change by company name, never by a person's name.",
    level: "convention",
    kind: "preference",
  },
] as const;

export const PROJECT = {
  name: "Feedback Board",
  goal: "Ship a reliable weekly digest and the most requested enterprise features this quarter.",
  focus: "Digest correctness, triage speed, CSV export.",
  idempotencyKey: "example-workspace/feedback-board",
  items: [
    { kind: "todo", status: "todo", title: "Fix board pagination skipping the newest feedback", summary: "Page 1 shows items 21–40; see GitHub issue." },
    { kind: "todo", status: "todo", title: "Make tags case-insensitive", summary: "Billing and billing are counted separately; existing data needs normalizing too." },
    { kind: "blocker", status: "blocked", title: "Sunday digest is empty", summary: "The Sunday 18:00 digest shows the following week. Customers received an empty digest twice." },
    { kind: "todo", status: "todo", title: "Add CSV export", summary: "Requested by Brightwave (enterprise, 14 votes)." },
    { kind: "risk", status: "open", title: "Priority scoring has no tests", summary: "Triage order depends on priorityScore, and a regression would go unnoticed." },
    { kind: "decision", status: "decision", title: "Keep SQLite for this year", summary: "Volume stays under 100k items; revisit if a customer needs multi-region." },
  ],
} as const;

export const WORKFLOW = {
  name: "Weekly feedback digest",
  description: "Drafts the weekly customer digest, waits for a person to approve it, then prepares the published version.",
};

export const AUTOMATION = {
  name: "Publish the weekly digest",
  cron: "0 18 * * 0",
  timezone: "UTC",
};

/** Completed sessions visitors can open. Running them spends model budget. */
export const SESSIONS = [
  {
    key: "sunday-digest",
    mate: "repo-analyst",
    title: "Why is the Sunday digest empty?",
    prompt: `Customers say the weekly digest is empty when it is generated on a Sunday (see the "Weekly digest is empty when generated on a Sunday" issue in ${REPO.repoUrl}). Find the root cause, reproduce it with a failing test, and propose the fix. Do not open a pull request.`,
  },
  {
    key: "priority-tests",
    mate: "test-engineer",
    title: "Cover priority scoring with tests",
    prompt: `Add tests for priorityScore in server/feedback.ts of ${REPO.repoUrl}, following the "Add tests for priority scoring" issue. Report any case where the current behavior looks wrong instead of changing it.`,
  },
  {
    key: "release-notes",
    mate: "release-writer",
    title: "Draft release notes for 0.4",
    prompt: `Draft customer-facing release notes for Feedback Board 0.4 from the repository history of ${REPO.repoUrl} and the team's handbook. Keep it under 150 words.`,
  },
] as const;
