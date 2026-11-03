import type { Feedback, FeedbackStore, State } from "./feedback.ts";

export type Digest = {
  weekStart: string;
  weekEnd: string;
  received: number;
  byState: Record<State, number>;
  topTags: { tag: string; count: number }[];
  topRequests: Pick<Feedback, "id" | "title" | "customer" | "votes" | "priority">[];
  unassigned: number;
};

/** Weeks run Monday 00:00 through the following Monday 00:00. */
export function weekStartFor(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = 1 - start.getDay();
  start.setDate(start.getDate() + offset);
  return start;
}

export function buildDigest(store: FeedbackStore, anyDayInWeek: Date): Digest {
  const weekStart = weekStartFor(anyDayInWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const items = store.createdBetween(weekStart, weekEnd);

  const byState: Record<State, number> = { new: 0, triaged: 0, planned: 0, done: 0, declined: 0 };
  const tagCounts = new Map<string, number>();
  for (const item of items) {
    byState[item.state] += 1;
    for (const tag of item.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    received: items.length,
    byState,
    topTags: [...tagCounts]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 5),
    topRequests: [...items]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(({ id, title, customer, votes, priority }) => ({ id, title, customer, votes, priority })),
    unassigned: items.filter((item) => !item.owner && item.state !== "declined").length,
  };
}

export function digestMarkdown(digest: Digest): string {
  const lines = [
    `# Feedback digest — week of ${digest.weekStart.slice(0, 10)}`,
    "",
    `Received **${digest.received}** pieces of feedback; **${digest.unassigned}** still need an owner.`,
    "",
    "## Top requests",
    ...digest.topRequests.map((item) => `- #${item.id} ${item.title} (${item.customer}, ${item.votes} votes)`),
    "",
    "## Top tags",
    ...digest.topTags.map((tag) => `- ${tag.tag}: ${tag.count}`),
  ];
  return lines.join("\n");
}
