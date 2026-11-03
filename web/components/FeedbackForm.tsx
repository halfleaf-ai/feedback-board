import { useState, type FormEvent } from "react";
import { api } from "../api.ts";

const EMPTY = { title: "", body: "", customer: "", customerTier: "free" as const, tags: "" };

export function FeedbackForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; customer: string; customerTier: "free" | "team" | "enterprise"; tags: string }>(EMPTY);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.create({ ...form, tags: form.tags.split(",") });
      setForm(EMPTY);
      setOpen(false);
      setError(undefined);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!open) {
    return (
      <button className="primary" onClick={() => setOpen(true)}>
        New feedback
      </button>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <input required placeholder="What did the customer ask for?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea placeholder="Details" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      <div className="row">
        <input required placeholder="Customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
        <select value={form.customerTier} onChange={(e) => setForm({ ...form, customerTier: e.target.value as typeof form.customerTier })}>
          <option value="free">free</option>
          <option value="team">team</option>
          <option value="enterprise">enterprise</option>
        </select>
        <input placeholder="Tags, comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="primary" type="submit">
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
