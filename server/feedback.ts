import type { Database } from "./db.ts";

export const STATES = ["new", "triaged", "planned", "done", "declined"] as const;
export const TIERS = ["free", "team", "enterprise"] as const;

export type State = (typeof STATES)[number];
export type Tier = (typeof TIERS)[number];

export type Feedback = {
  id: number;
  title: string;
  body: string;
  customer: string;
  customerTier: Tier;
  state: State;
  owner: string | null;
  votes: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  priority: number;
};

export type NewFeedback = {
  title: string;
  body?: string;
  customer: string;
  customerTier?: Tier;
  tags?: string[];
  createdAt?: string;
};

export type FeedbackPatch = Partial<{
  state: State;
  owner: string | null;
  tags: string[];
  votes: number;
}>;

export type ListQuery = {
  state?: State;
  tag?: string;
  owner?: string;
  page?: number;
  pageSize?: number;
};

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };

type Row = {
  id: number;
  title: string;
  body: string;
  customer: string;
  customer_tier: Tier;
  state: State;
  owner: string | null;
  votes: number;
  created_at: string;
  updated_at: string;
};

const TIER_WEIGHT: Record<Tier, number> = { free: 1, team: 2, enterprise: 4 };
const OPEN_STATES: State[] = ["new", "triaged"];

/**
 * Ranks feedback for triage. Votes count more for paying tiers, and open
 * feedback gains weight the longer it waits so nothing sits forever.
 */
export function priorityScore(item: Pick<Feedback, "votes" | "customerTier" | "state" | "createdAt">, now = new Date()): number {
  if (!OPEN_STATES.includes(item.state)) return 0;
  const ageDays = Math.max(0, (now.getTime() - new Date(item.createdAt).getTime()) / 86_400_000);
  const ageBoost = Math.min(ageDays / 7, 4);
  return Math.round((item.votes * TIER_WEIGHT[item.customerTier] + ageBoost) * 10) / 10;
}

export function normalizeTags(tags: string[] = []): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function toFeedback(row: Row, tags: string[], now: Date): Feedback {
  const item = {
    id: row.id,
    title: row.title,
    body: row.body,
    customer: row.customer,
    customerTier: row.customer_tier,
    state: row.state,
    owner: row.owner,
    votes: row.votes,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...item, priority: priorityScore(item, now) };
}

export class FeedbackStore {
  constructor(
    private readonly db: Database,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  create(input: NewFeedback): Feedback {
    const title = input.title.trim();
    const customer = input.customer.trim();
    if (!title) throw new ValidationError("title is required");
    if (!customer) throw new ValidationError("customer is required");
    const now = (input.createdAt ? new Date(input.createdAt) : this.clock()).toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO feedback (title, body, customer, customer_tier, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(title, input.body?.trim() ?? "", customer, input.customerTier ?? "free", now, now);
    const id = Number(result.lastInsertRowid);
    this.replaceTags(id, normalizeTags(input.tags));
    return this.get(id)!;
  }

  get(id: number): Feedback | undefined {
    const row = this.db.prepare("SELECT * FROM feedback WHERE id = ?").get(id) as Row | undefined;
    if (!row) return undefined;
    return toFeedback(row, this.tagsFor([id]).get(id) ?? [], this.clock());
  }

  list(query: ListQuery = {}): Page<Feedback> {
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (query.state) {
      where.push("f.state = ?");
      params.push(query.state);
    }
    if (query.owner) {
      where.push("f.owner = ?");
      params.push(query.owner);
    }
    if (query.tag) {
      where.push("EXISTS (SELECT 1 FROM feedback_tag t WHERE t.feedback_id = f.id AND t.tag = ?)");
      params.push(query.tag.trim());
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { total } = this.db.prepare(`SELECT COUNT(*) AS total FROM feedback f ${clause}`).get(...params) as {
      total: number;
    };
    const rows = this.db
      .prepare(`SELECT f.* FROM feedback f ${clause} ORDER BY f.created_at DESC, f.id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, page * pageSize) as Row[];
    const tags = this.tagsFor(rows.map((row) => row.id));
    const now = this.clock();
    return { items: rows.map((row) => toFeedback(row, tags.get(row.id) ?? [], now)), page, pageSize, total };
  }

  update(id: number, patch: FeedbackPatch): Feedback | undefined {
    const current = this.get(id);
    if (!current) return undefined;
    if (patch.state && !STATES.includes(patch.state)) throw new ValidationError(`unknown state: ${patch.state}`);
    if (patch.votes !== undefined && (!Number.isInteger(patch.votes) || patch.votes < 0)) {
      throw new ValidationError("votes must be a non-negative integer");
    }
    const owner = patch.owner === undefined ? current.owner : patch.owner?.trim() || null;
    this.db
      .prepare("UPDATE feedback SET state = ?, owner = ?, votes = ?, updated_at = ? WHERE id = ?")
      .run(patch.state ?? current.state, owner, patch.votes ?? current.votes, this.clock().toISOString(), id);
    if (patch.tags) this.replaceTags(id, normalizeTags(patch.tags));
    return this.get(id);
  }

  remove(id: number): boolean {
    return this.db.prepare("DELETE FROM feedback WHERE id = ?").run(id).changes > 0;
  }

  /** Every tag in use, with how many feedback items carry it. */
  tags(): { tag: string; count: number }[] {
    return this.db
      .prepare("SELECT tag, COUNT(*) AS count FROM feedback_tag GROUP BY tag ORDER BY count DESC, tag")
      .all() as { tag: string; count: number }[];
  }

  /** Feedback created in [from, to), oldest first. */
  createdBetween(from: Date, to: Date): Feedback[] {
    const rows = this.db
      .prepare("SELECT * FROM feedback WHERE created_at >= ? AND created_at < ? ORDER BY created_at, id")
      .all(from.toISOString(), to.toISOString()) as Row[];
    const tags = this.tagsFor(rows.map((row) => row.id));
    const now = this.clock();
    return rows.map((row) => toFeedback(row, tags.get(row.id) ?? [], now));
  }

  private replaceTags(id: number, tags: string[]) {
    this.db.prepare("DELETE FROM feedback_tag WHERE feedback_id = ?").run(id);
    const insert = this.db.prepare("INSERT INTO feedback_tag (feedback_id, tag) VALUES (?, ?)");
    for (const tag of tags) insert.run(id, tag);
  }

  private tagsFor(ids: number[]): Map<number, string[]> {
    const byId = new Map<number, string[]>();
    if (ids.length === 0) return byId;
    const rows = this.db
      .prepare(`SELECT feedback_id, tag FROM feedback_tag WHERE feedback_id IN (${ids.map(() => "?").join(",")}) ORDER BY tag`)
      .all(...ids) as { feedback_id: number; tag: string }[];
    for (const row of rows) byId.set(row.feedback_id, [...(byId.get(row.feedback_id) ?? []), row.tag]);
    return byId;
  }
}

export class ValidationError extends Error {}
