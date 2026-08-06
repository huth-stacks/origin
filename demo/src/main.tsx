import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./fonts.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Acme demo root is missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
