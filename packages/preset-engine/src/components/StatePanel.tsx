import { useStore } from "@nanostores/react";
import { lightColors, globalTokens, dirty } from "../store";

export function StatePanel() {
  const light = useStore(lightColors);
  const isDirty = useStore(dirty);
  const global = useStore(globalTokens);

  const tokenCount = Object.keys(light).length;

  return (
    <aside className="preset-panel">
      <div className="mb-3 flex items-center justify-between">
        <span className="preset-section-label mb-0">Current Tokens</span>
      </div>
      <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
        <div>--primary: {light.primary ?? "—"}</div>
        <div>--background: {light.background ?? "—"}</div>
        <div>--foreground: {light.foreground ?? "—"}</div>
        <div>--muted: {light.muted ?? "—"}</div>
        <div>--border: {light.border ?? "—"}</div>
        <div>--radius: {global.radius}</div>
        <div>--spacing: {global.spacing}</div>
        <div>--font-sans: {global.fontSans?.slice(0, 30)}…</div>
        <div>--sidebar-width: {global.sidebarWidth}</div>
        <div className="mt-2 border-t border-border pt-2">
          <div>tokens: {tokenCount}</div>
          <div>
            status:{" "}
            <span className={isDirty ? "text-orange-500" : "text-green-500"}>
              {isDirty ? "● unsaved" : "● saved"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
