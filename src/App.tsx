import { Analytics } from "@vercel/analytics/react";
import { AppShell } from "@/components/app/app-shell";

function App() {
  const analyticsEnabled = import.meta.env.VITE_ENABLE_ANALYTICS === "true";

  return (
    <>
      <AppShell />
      {analyticsEnabled ? <Analytics /> : null}
    </>
  );
}

export default App;
