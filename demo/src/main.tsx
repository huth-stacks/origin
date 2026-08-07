import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { EvidenceApp } from "./EvidenceApp";
import "./fonts.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";
import "./evidence.css";

const root = document.getElementById("root");
if (!root) throw new Error("Origin demo root is missing");

const evidenceSurface =
  window.location.pathname.startsWith("/evidence") ||
  window.location.hostname.startsWith("origin-attester.");

createRoot(root).render(
  <StrictMode>{evidenceSurface ? <EvidenceApp /> : <App />}</StrictMode>,
);
