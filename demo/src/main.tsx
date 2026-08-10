import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { EvidenceApp } from "./EvidenceApp";
import { RegistryApp } from "./RegistryApp";
import "./fonts.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";
import "./evidence.css";
import "./registry.css";

const root = document.getElementById("root");
if (!root) throw new Error("Origin demo root is missing");

const evidenceSurface =
  window.location.pathname.startsWith("/evidence") ||
  window.location.hostname.startsWith("origin-attester.");
const registrySurface = window.location.pathname.startsWith("/registry");
if (evidenceSurface) document.documentElement.dataset.surface = "evidence";
else if (registrySurface) document.documentElement.dataset.surface = "registry";
else delete document.documentElement.dataset.surface;

createRoot(root).render(
  <StrictMode>
    {evidenceSurface ? (
      <EvidenceApp />
    ) : registrySurface ? (
      <RegistryApp />
    ) : (
      <App />
    )}
  </StrictMode>,
);
