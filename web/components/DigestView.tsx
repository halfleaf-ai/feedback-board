import { useEffect, useState } from "react";
import { api, type Digest } from "../api.ts";

const today = () => new Date().toISOString().slice(0, 10);

export function DigestView() {
  const [day, setDay] = useState(today);
  const [digest, setDigest] = useState<Digest>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    api
      .digest(day)
      .then((result) => {
        setDigest(result);
        setError(undefined);
      })
      .catch((err: Error) => setError(err.message));
  }, [day]);

  return (
    <div className="digest">
      <label className="toolbar">
        Week containing <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <a className="muted" href={`/api/digests/${day}?format=markdown`} target="_blank" rel="noreferrer">
          Markdown
        </a>
      </label>
      {error && <p className="error">{error}</p>}
      {digest && (
        <>
          <h2>
            {new Date(digest.weekStart).toLocaleDateString()} – {new Date(new Date(digest.weekEnd).getTime() - 1).toLocaleDateString()}
          </h2>
          <div className="stats">
            <Stat label="Received" value={digest.received} />
            <Stat label="Unassigned" value={digest.unassigned} />
            <Stat label="Planned" value={digest.byState.planned} />
            <Stat label="Done" value={digest.byState.done} />
          </div>
          <h3>Top requests</h3>
          {digest.topRequests.length === 0 ? (
            <p className="muted">No feedback this week.</p>
          ) : (
            <ol>
              {digest.topRequests.map((item) => (
                <li key={item.id}>
                  {item.title} <span className="muted">— {item.customer}, {item.votes} votes</span>
                </li>
              ))}
            </ol>
          )}
          <h3>Top tags</h3>
          <div className="tags">
            {digest.topTags.map(({ tag, count }) => (
              <span key={tag} className="tag">
                {tag} · {count}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
