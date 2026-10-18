import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FxProvider } from "./fx";
import "./styles.css";
import "./looks.css";
import { applyLookFromUrl } from "./theme/looks";
import { applyTypeFromUrl } from "./theme/type";

applyLookFromUrl();
applyTypeFromUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FxProvider>
      <App />
    </FxProvider>
  </StrictMode>,
);
