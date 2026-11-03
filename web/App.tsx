import { useState } from "react";
import { Board } from "./components/Board.tsx";
import { DigestView } from "./components/DigestView.tsx";

const TABS = [
  { id: "board", label: "Board" },
  { id: "digest", label: "Weekly digest" },
] as const;

export function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("board");
  return (
    <div className="shell">
      <header className="header">
        <h1>Feedback Board</h1>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((item) => (
            <button key={item.id} className={tab === item.id ? "tab active" : "tab"} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main>{tab === "board" ? <Board /> : <DigestView />}</main>
    </div>
  );
}
