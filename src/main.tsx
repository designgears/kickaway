import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/index.css";
import { GiveawayProvider } from "@/context/giveaway-context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GiveawayProvider>
      <App />
    </GiveawayProvider>
  </StrictMode>,
);
