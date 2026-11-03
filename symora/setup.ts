/**
 * Builds the Symora example workspace for Feedback Board through Symora's
 * management APIs. Safe to run repeatedly: each resource is looked up by its
 * name, slug or idempotency key before it is created.
 *
 *   npx tsx symora/setup.ts --base https://symora.example.com/api [--run-sessions]
 *
 * Set SYMORA_SESSION to reuse a signed-in session instead of the browser
 * device sign-in.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { signIn, sleep, Symora } from "./client.ts";
import { AUTOMATION, KNOWLEDGE, MATES, MEMORY, ORGANIZATION, PROJECT, REPO, SESSIONS, WORKFLOW } from "./content.ts";

type Named = { id: string; name?: string; slug?: string; title?: string };
type SessionState = { sessionId: string; runId: string; shareToken?: string };
type State = { sessions: Record<string, SessionState> };

const STATE_FILE = new URL("./.state.json", import.meta.url);

const { values: args } = parseArgs({
  options: { base: { type: "string" }, "run-sessions": { type: "boolean", default: false } },
});
if (!args.base) {
  console.error("usage: npx tsx symora/setup.ts --base https://<host>/api [--run-sessions]");
  process.exit(2);
}
const base = args.base.replace(/\/+$/, "");

const api = new Symora(base, process.env.SYMORA_SESSION ?? (await signIn(base)));
const state: State = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : { sessions: {} };
const saveState = () => writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);

const step = (label: string, outcome: "created" | "exists" | "updated", id: string) =>
  console.log(`${outcome === "exists" ? "·" : "+"} ${label} ${outcome} (${id})`);

// Organization -------------------------------------------------------------

type AuthSession = { id: string; organization: Named | null; organizations: Named[] };
const currentSession = async () => {
  const response = await api.get<{ authenticated: boolean; user: AuthSession | null }>("/auth/session");
  if (!response.authenticated || !response.user) throw new Error("not signed in: the session was rejected");
  return response.user;
};
let session = await currentSession();
let organization = session.organizations.find((org) => org.name === ORGANIZATION);
if (organization) {
  if (session.organization?.id !== organization.id) await api.post("/auth/organization/switch", { organization_id: organization.id });
  step("Organization", "exists", organization.id);
} else {
  organization = (await api.post<{ organization: Named }>("/auth/organizations", { name: ORGANIZATION })).organization;
  step("Organization", "created", organization.id);
}
session = await currentSession();
if (session.organization?.id !== organization.id) throw new Error(`session is in ${session.organization?.id}, expected ${organization.id}`);
const me = session.id;

// Mates --------------------------------------------------------------------

const mateIds: Record<string, string> = {};
const existingMates = (await api.get<{ agent_specs: (Named & { status?: string })[] }>("/agent/agent-specs")).agent_specs;
for (const mate of MATES) {
  let spec = existingMates.find((candidate) => candidate.slug === mate.slug);
  if (spec) {
    step(`Mate ${mate.name}`, "exists", spec.id);
  } else {
    spec = (await api.post<{ agent_spec: Named }>("/agent/agent-specs", { ...mate, visibility: "shared" })).agent_spec;
    step(`Mate ${mate.name}`, "created", spec.id);
  }
  if (spec.status !== "published") await api.post(`/agent/agent-specs/${spec.id}/publish`);
  mateIds[mate.slug] = spec.id;
}

// Knowledge ----------------------------------------------------------------

const bases = (await api.get<{ bases: Named[] }>("/knowledge/bases")).bases;
let base_ = bases.find((candidate) => candidate.slug === KNOWLEDGE.slug);
if (base_) {
  step("Knowledge base", "exists", base_.id);
} else {
  base_ = (
    await api.post<{ base: Named }>("/knowledge/bases", {
      name: KNOWLEDGE.name,
      slug: KNOWLEDGE.slug,
      description: KNOWLEDGE.description,
      visibility: "shared",
    })
  ).base;
  step("Knowledge base", "created", base_.id);
}
await api.post("/knowledge/push", {
  kb_id: base_.id,
  entries: KNOWLEDGE.pages.map((page) => ({ ...page, kind: "file" })),
  commit_message: "Sync the Feedback Board handbook",
  replace: false,
});
step(`Knowledge pages (${KNOWLEDGE.pages.length})`, "updated", base_.id);

// Memory -------------------------------------------------------------------

for (const card of MEMORY) {
  const created = await api.post<{ card: Named }>("/memory/cards", {
    ...card,
    owner_type: "team",
    applies_to: "global",
    load_policy: "retrieved",
    idempotency_key: `example-workspace/${card.title}`,
  });
  step(`Memory "${card.title}"`, "updated", created.card.id);
}

// Project ------------------------------------------------------------------

const project = (
  await api.post<{ project: Named }>("/projecthub/projects", {
    name: PROJECT.name,
    goal: PROJECT.goal,
    focus: PROJECT.focus,
    language: "en",
    idempotency_key: PROJECT.idempotencyKey,
  })
).project;
step("Project", "updated", project.id);

const repos = (await api.get<{ repos: Named[] }>(`/projecthub/projects/${project.id}/repos`)).repos;
if (!repos.some((repo) => repo.name === REPO.name)) {
  const repo = await api.post<{ repo: Named }>(`/projecthub/projects/${project.id}/repos`, {
    name: REPO.name,
    clone_url: REPO.cloneUrl,
    repo_url: REPO.repoUrl,
    default_branch: REPO.defaultBranch,
  });
  step("Project repository", "created", repo.repo.id);
}

const items = (await api.get<{ items: Named[] }>(`/projecthub/projects/${project.id}/items`)).items;
for (const item of PROJECT.items) {
  const found = items.find((candidate) => candidate.title === item.title);
  if (found) {
    step(`Project item "${item.title}"`, "exists", found.id);
    continue;
  }
  const created = await api.post<{ item: Named }>(`/projecthub/projects/${project.id}/items`, item);
  step(`Project item "${item.title}"`, "created", created.item.id);
}

// Workflow -----------------------------------------------------------------

const workflows = (await api.get<{ workflows: (Named & { status?: string })[] }>(`/agent/workflows?q=${encodeURIComponent(WORKFLOW.name)}`)).workflows;
let workflow = workflows.find((candidate) => candidate.name === WORKFLOW.name);
if (workflow) {
  step("Workflow", "exists", workflow.id);
} else {
  workflow = (await api.post<{ workflow: Named }>("/agent/workflows", { ...WORKFLOW, visibility: "shared", ...digestWorkflow(me) })).workflow;
  step("Workflow", "created", workflow.id);
}
if (workflow.status !== "published") await api.post(`/agent/workflows/${workflow.id}/publish`);

// Automation ---------------------------------------------------------------

const automations = (await api.get<{ automations: Named[] }>(`/agent/automations?q=${encodeURIComponent(AUTOMATION.name)}`)).automations;
const automation = automations.find((candidate) => candidate.name === AUTOMATION.name);
if (automation) {
  step("Automation", "exists", automation.id);
} else {
  const created = await api.post<{ automation: Named }>("/agent/automations", {
    name: AUTOMATION.name,
    trigger_type: "schedule",
    schedule: { cron: AUTOMATION.cron, timezone: AUTOMATION.timezone },
    source_type: "workflow",
    source_id: workflow.id,
    visibility: "shared",
  });
  step("Automation", "created", created.automation.id);
}

// Sessions -----------------------------------------------------------------

if (args["run-sessions"]) {
  for (const scenario of SESSIONS) {
    let entry = state.sessions[scenario.key];
    if (!entry) {
      const created = await api.post<{ id: string }>("/agent/sessions", { title: scenario.title, agent_spec_id: mateIds[scenario.mate] });
      const sent = await api.post<{ run: { id: string } }>(`/agent/sessions/${created.id}/messages`, {
        content: scenario.prompt,
        agent_spec_id: mateIds[scenario.mate],
      });
      // Recorded before waiting: a started run is never started again.
      entry = state.sessions[scenario.key] = { sessionId: created.id, runId: sent.run.id };
      saveState();
      step(`Session "${scenario.title}"`, "created", created.id);
    }
    const status = await waitForRun(entry.runId);
    if (status !== "succeeded") {
      console.warn(`! Session "${scenario.title}" ended ${status}; not shared. Delete its entry in symora/.state.json to run it again.`);
      continue;
    }
    if (!entry.shareToken) {
      entry.shareToken = (await api.post<{ token: string }>(`/agent/sessions/${entry.sessionId}/share`)).token;
      saveState();
    }
    console.log(`  share: ${new URL(base).origin}/share/${entry.shareToken}`);
  }
} else {
  console.log("· Sessions skipped (pass --run-sessions to run them; this spends model budget)");
}

console.log("\nDone. Grant the guest account a viewer membership once guest sign-in is enabled on this deployment.");

// ---------------------------------------------------------------------------

async function waitForRun(runId: string): Promise<string> {
  for (;;) {
    const run = await api.get<{ status?: string; run?: { status: string } }>(`/agent/runs/${runId}`);
    const status = run.run?.status ?? run.status ?? "unknown";
    if (["succeeded", "failed", "canceled"].includes(status)) return status;
    await sleep(10_000);
  }
}

/** The digest workflow as the editor graph and the executable spec, built from one definition. */
function digestWorkflow(approver: string) {
  const human = [
    { id: "complete", label: "Complete", description: "Human confirmed and continue to the next node." },
    { id: "reject", label: "Reject", description: "Human rejected this checkpoint." },
  ];
  const nodes = [
    {
      id: "draft",
      type: "llm",
      name: "Draft the digest",
      prompt: `Clone ${REPO.cloneUrl}, run the app's digest for the week that is ending and draft a customer-facing summary following the team handbook's weekly-digest page.`,
    },
    {
      id: "review",
      type: "human",
      name: "Approve the digest",
      prompt: "Check the draft for accuracy and tone. Complete to publish it, or reject with what to change.",
      assignee: approver,
    },
    { id: "publish", type: "llm", name: "Prepare for publishing", prompt: "Format the approved digest as the final Markdown post and list the customers it credits." },
    { id: "rejected", type: "llm", name: "Record the rejection", prompt: "Summarize the reviewer's requested changes as a follow-up item for next week." },
  ];
  const edges = [
    { id: "draft-review", source: "draft", target: "review", mode: "next" },
    { id: "review-publish", source: "review", target: "publish", mode: "route", option: "complete" },
    { id: "review-rejected", source: "review", target: "rejected", mode: "route", option: "reject" },
  ];
  const graph = {
    nodes: nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: { x: 0, y: index * 160 },
      data: { type: node.type, name: node.name, prompt: node.prompt, ...(node.assignee ? { assigneeUserId: node.assignee } : {}) },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: { mode: edge.mode, ...(edge.option ? { routeOptionId: edge.option } : {}) },
    })),
  };
  const spec = {
    version: 1,
    entry_node_id: nodes[0].id,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      name: node.name,
      prompt: node.prompt,
      ...(node.assignee ? { assignee_user_id: node.assignee, router_options: human } : {}),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      mode: edge.mode,
      ...(edge.option ? { label: human.find((option) => option.id === edge.option)!.label } : {}),
    })),
  };
  return { graph, spec };
}
