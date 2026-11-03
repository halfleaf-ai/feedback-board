import { useCallback, useEffect, useState } from "react";
import { api, type Feedback, type Filters, type State } from "../api.ts";
import { FeedbackCard } from "./FeedbackCard.tsx";
import { FeedbackForm } from "./FeedbackForm.tsx";

const STATES: State[] = ["new", "triaged", "planned", "done", "declined"];

export function Board() {
  const [filters, setFilters] = useState<Filters>({ page: 1 });
  const [items, setItems] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const [page, tagList] = await Promise.all([api.list(filters), api.tags()]);
      setItems(page.items);
      setTotal(page.total);
      setPageSize(page.pageSize);
      setTags(tagList);
      setError(undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const filter = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch, page: 1 }));
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="board">
      <section className="toolbar" aria-label="Filters">
        <select value={filters.state ?? ""} onChange={(e) => filter({ state: (e.target.value || undefined) as State | undefined })}>
          <option value="">All states</option>
          {STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <select value={filters.tag ?? ""} onChange={(e) => filter({ tag: e.target.value || undefined })}>
          <option value="">All tags</option>
          {tags.map(({ tag, count }) => (
            <option key={tag} value={tag}>
              {tag} ({count})
            </option>
          ))}
        </select>
        <input placeholder="Owner" value={filters.owner ?? ""} onChange={(e) => filter({ owner: e.target.value || undefined })} />
        <span className="muted">{total} items</span>
      </section>

      <FeedbackForm onCreated={load} />

      {error && <p className="error">{error}</p>}
      {items.length === 0 && !error && <p className="muted">No feedback matches these filters.</p>}
      <ul className="list">
        {items.map((item) => (
          <FeedbackCard key={item.id} item={item} onChanged={load} />
        ))}
      </ul>

      <nav className="pager" aria-label="Pages">
        <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
          Previous
        </button>
        <span>
          Page {filters.page} of {pages}
        </span>
        <button disabled={filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
          Next
        </button>
      </nav>
    </div>
  );
}
