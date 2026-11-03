import { useState } from "react";
import { api, type Feedback, type State } from "../api.ts";

const STATES: State[] = ["new", "triaged", "planned", "done", "declined"];

export function FeedbackCard({ item, onChanged }: { item: Feedback; onChanged: () => void }) {
  const [owner, setOwner] = useState(item.owner ?? "");
  const [error, setError] = useState<string>();

  const save = async (patch: Parameters<typeof api.update>[1]) => {
    try {
      await api.update(item.id, patch);
      setError(undefined);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <li className="card">
      <div className="card-main">
        <div className="card-title">
          <span className="id">#{item.id}</span> {item.title}
        </div>
        <div className="card-meta">
          {item.customer} <span className={`tier tier-${item.customerTier}`}>{item.customerTier}</span>
          <span className="muted"> · {new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
        {item.body && <p className="card-body">{item.body}</p>}
        <div className="tags">
          {item.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
      </div>
      <div className="card-side">
        <button className="votes" title="Add a vote" onClick={() => save({ votes: item.votes + 1 })}>
          ▲ {item.votes}
        </button>
        <span className="priority" title="Triage priority">
          P {item.priority}
        </span>
        <select value={item.state} onChange={(e) => save({ state: e.target.value as State })}>
          {STATES.map((state) => (
            <option key={state}>{state}</option>
          ))}
        </select>
        <input
          aria-label="Owner"
          placeholder="Unassigned"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          onBlur={() => owner !== (item.owner ?? "") && save({ owner })}
        />
      </div>
    </li>
  );
}
