import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// P0 shell: the dashboard (P4) replaces this.
function App() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Meridian</h1>
      <span className="badge">SIMULATED DATA</span>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
