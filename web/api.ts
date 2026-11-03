import type { Digest } from "../server/digest.ts";
import type { Feedback, FeedbackPatch, NewFeedback, Page, State } from "../server/feedback.ts";

export type { Digest, Feedback, State };

export type Filters = { state?: State; tag?: string; owner?: string; page: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  list(filters: Filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== "") params.set(key, String(value));
    return request<Page<Feedback>>(`/feedback?${params}`);
  },
  create: (input: NewFeedback) => request<Feedback>("/feedback", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, patch: FeedbackPatch) => request<Feedback>(`/feedback/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: number) => request<void>(`/feedback/${id}`, { method: "DELETE" }),
  tags: () => request<{ tag: string; count: number }[]>("/tags"),
  digest: (weekStart: string) => request<Digest>(`/digests/${weekStart}`),
};
