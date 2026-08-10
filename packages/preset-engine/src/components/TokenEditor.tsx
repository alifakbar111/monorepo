import { useStore } from "@nanostores/react";
import { lightColors, darkColors, globalTokens, markDirty } from "../store";
import { ColorPicker } from "./ColorPicker";
import { RadiusPreview } from "./RadiusPreview";

export function TokenEditor({ section }: { section: string }) {
  const light = useStore(lightColors);
  const dark = useStore(darkColors);
  const global = useStore(globalTokens);

  function patchLight(key: string, val: string) {
    lightColors.set({ ...light, [key]: val });
    markDirty();
  }

  function patchDark(key: string, val: string) {
    darkColors.set({ ...dark, [key]: val });
    markDirty();
  }

  function patchGlobal(key: string, val: string) {
    globalTokens.set({ ...global, [key]: val });
    markDirty();
  }

  if (section === "colors") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Light Theme</h3>
        {Object.entries(light).map(([key, val]) => (
          <ColorPicker
            key={key}
            label={key}
            value={val}
            onChange={(v) => patchLight(key, v)}
          />
        ))}
        <h3 className="mb-3 mt-4 text-sm font-semibold">Dark Theme</h3>
        {Object.entries(dark).map(([key, val]) => (
          <ColorPicker
            key={key}
            label={key}
            value={val}
            onChange={(v) => patchDark(key, v)}
          />
        ))}
      </div>
    );
  }

  if (section === "typography") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Typography</h3>
        
        {/* Heading Font */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Heading Font</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              placeholder="Merriweather, Georgia, serif"
              value={global.fontHeading || ''}
              onChange={(e) => patchGlobal("fontHeading", e.target.value)}
            />
          </div>
          <input
            type="text"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
            placeholder="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap"
            value={global.fontHeadingUrl || ''}
            onChange={(e) => patchGlobal("fontHeadingUrl", e.target.value)}
          />
        </div>

        {/* Body Font */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Body / Text Font</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              placeholder="Roboto, ui-sans-serif, sans-serif"
              value={global.fontBody || ''}
              onChange={(e) => patchGlobal("fontBody", e.target.value)}
            />
          </div>
          <input
            type="text"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
            placeholder="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
            value={global.fontBodyUrl || ''}
            onChange={(e) => patchGlobal("fontBodyUrl", e.target.value)}
          />
        </div>

        {/* Mono Font */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Mono Font</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              placeholder="JetBrains Mono, ui-monospace, monospace"
              value={global.fontMono}
              onChange={(e) => patchGlobal("fontMono", e.target.value)}
            />
          </div>
          <input
            type="text"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
            placeholder="https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap"
            value={global.fontMonoUrl || ''}
            onChange={(e) => patchGlobal("fontMonoUrl", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (section === "radius") {
    const radiusValue = parseFloat(global.radius) || 0.6;
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Border Radius</h3>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Base Radius</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.0625"
              min="0"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={radiusValue}
              onChange={(e) => patchGlobal("radius", `${e.target.value}rem`)}
            />
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">rem</span>
          </div>
        </div>
        <RadiusPreview />
      </div>
    );
  }

  if (section === "spacing") {
    const spacingValue = parseFloat(global.spacing) || 0.25;
    const sidebarValue = parseFloat(global.sidebarWidth) || 16;
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Spacing</h3>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Base Spacing</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.0625"
              min="0"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={spacingValue}
              onChange={(e) => patchGlobal("spacing", `${e.target.value}rem`)}
            />
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">rem</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Sidebar Width</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              min="0"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              value={sidebarValue}
              onChange={(e) => patchGlobal("sidebarWidth", `${e.target.value}rem`)}
            />
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">rem</span>
          </div>
        </div>
      </div>
    );
  }

  if (section === "shadows") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Shadows</h3>
        <p className="text-xs text-muted-foreground">
          Shadow tokens are defined in the @theme block. Edit global.css
          directly or extend this editor to support shadow presets.
        </p>
      </div>
    );
  }

  if (section === "breakpoints") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Breakpoints</h3>
        <p className="text-xs text-muted-foreground">
          Breakpoints are inherited from Tailwind v4 defaults. Override in
          global.css @theme block as needed.
        </p>
      </div>
    );
  }

  return <div className="text-sm text-muted-foreground">{section} editor</div>;
}
