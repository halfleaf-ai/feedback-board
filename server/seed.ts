import { openDatabase } from "./db.ts";
import { FeedbackStore, type NewFeedback, type State } from "./feedback.ts";

const SAMPLES: (NewFeedback & { state?: State; owner?: string; votes?: number; daysAgo: number })[] = [
  { title: "Export feedback to CSV", customer: "Brightwave", customerTier: "enterprise", tags: ["export", "reporting"], votes: 14, daysAgo: 2 },
  { title: "Slack notification when feedback is assigned", customer: "Kettle & Co", customerTier: "team", tags: ["integrations"], votes: 9, daysAgo: 3, state: "triaged", owner: "maya" },
  { title: "Billing page shows the wrong seat count", customer: "Orchard Health", customerTier: "enterprise", tags: ["Billing"], votes: 6, daysAgo: 4, state: "planned", owner: "dev" },
  { title: "Invoices should list the tax ID", customer: "Pinecrest", customerTier: "team", tags: ["billing"], votes: 4, daysAgo: 5 },
  { title: "Dark mode", customer: "Solo Studio", customerTier: "free", tags: ["ui"], votes: 22, daysAgo: 6 },
  { title: "Merge duplicate feedback", customer: "Brightwave", customerTier: "enterprise", tags: ["triage"], votes: 7, daysAgo: 8, state: "triaged", owner: "sam" },
  { title: "Weekly digest arrives empty on some weeks", customer: "Kettle & Co", customerTier: "team", tags: ["digest", "bug"], votes: 3, daysAgo: 9 },
  { title: "Filter by customer tier", customer: "Orchard Health", customerTier: "enterprise", tags: ["triage", "ui"], votes: 5, daysAgo: 11 },
  { title: "Keyboard shortcuts for triage", customer: "Northgate Labs", customerTier: "team", tags: ["ui"], votes: 2, daysAgo: 13, state: "declined" },
  { title: "SSO with Okta", customer: "Orchard Health", customerTier: "enterprise", tags: ["security"], votes: 11, daysAgo: 15, state: "planned", owner: "dev" },
  { title: "Public roadmap page", customer: "Solo Studio", customerTier: "free", tags: ["roadmap"], votes: 18, daysAgo: 17 },
  { title: "Attach screenshots to feedback", customer: "Pinecrest", customerTier: "team", tags: ["ui"], votes: 8, daysAgo: 19, state: "done", owner: "maya" },
  { title: "API token per workspace", customer: "Northgate Labs", customerTier: "team", tags: ["integrations", "security"], votes: 4, daysAgo: 22 },
  { title: "Tag colors", customer: "Solo Studio", customerTier: "free", tags: ["ui"], votes: 3, daysAgo: 24, state: "done", owner: "sam" },
  { title: "Show who changed the state", customer: "Brightwave", customerTier: "enterprise", tags: ["audit"], votes: 6, daysAgo: 26 },
  { title: "Bulk assign owner", customer: "Kettle & Co", customerTier: "team", tags: ["triage"], votes: 5, daysAgo: 28 },
  { title: "Email digest instead of a page", customer: "Orchard Health", customerTier: "enterprise", tags: ["digest"], votes: 9, daysAgo: 30 },
  { title: "Vote on behalf of a customer", customer: "Pinecrest", customerTier: "team", tags: ["triage"], votes: 2, daysAgo: 33 },
  { title: "Archive old feedback", customer: "Northgate Labs", customerTier: "team", tags: ["triage"], votes: 3, daysAgo: 36 },
  { title: "Customer-facing status page per request", customer: "Solo Studio", customerTier: "free", tags: ["roadmap"], votes: 7, daysAgo: 38 },
  { title: "Import from Intercom", customer: "Brightwave", customerTier: "enterprise", tags: ["integrations"], votes: 10, daysAgo: 41 },
  { title: "Mobile layout for the board", customer: "Kettle & Co", customerTier: "team", tags: ["ui"], votes: 6, daysAgo: 44 },
  { title: "Search feedback text", customer: "Orchard Health", customerTier: "enterprise", tags: ["search"], votes: 12, daysAgo: 47 },
  { title: "Due dates on planned items", customer: "Pinecrest", customerTier: "team", tags: ["roadmap"], votes: 3, daysAgo: 50 },
  { title: "Owner workload view", customer: "Northgate Labs", customerTier: "team", tags: ["reporting"], votes: 4, daysAgo: 53 },
];

const db = openDatabase();
db.exec("DELETE FROM feedback_tag; DELETE FROM feedback;");
const store = new FeedbackStore(db);
const now = Date.now();
for (const sample of SAMPLES) {
  const created = store.create({ ...sample, createdAt: new Date(now - sample.daysAgo * 86_400_000).toISOString() });
  store.update(created.id, { state: sample.state, owner: sample.owner, votes: sample.votes });
}
console.log(`Seeded ${SAMPLES.length} feedback items.`);
