import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { TokenEditor } from "./components/TokenEditor";
import { StatePanel } from "./components/StatePanel";
import { Gallery } from "./components/Gallery";
import { fetchTokens } from "./api";
import { lightColors, darkColors, globalTokens, loading } from "./store";
import { parseColorsCss, parseGlobalCss } from "./engine/parse";

export function App() {
  const [activeSection, setActiveSection] = useState("colors");
  const isLoading = useStore(loading);

  useEffect(() => {
    fetchTokens().then((res) => {
      if (res.ok && res.colors && res.global) {
        const colors = parseColorsCss(res.colors);
        lightColors.set(colors.light);
        darkColors.set(colors.dark);
        globalTokens.set(parseGlobalCss(res.global));
      }
      loading.set(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tokens…</p>
      </div>
    );
  }

  return (
    <div className="preset-layout">
      <Toolbar />
      <Sidebar active={activeSection} onSelect={setActiveSection} />
      <main className="preset-canvas">
        {activeSection.startsWith("gallery:") ? (
          <Gallery section={activeSection} />
        ) : (
          <TokenEditor section={activeSection} />
        )}
      </main>
      <StatePanel />
    </div>
  );
}
