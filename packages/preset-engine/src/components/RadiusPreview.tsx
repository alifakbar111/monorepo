import { useStore } from "@nanostores/react";
import { globalTokens } from "../store";
import { RADIUS_MULTIPLIERS } from "../engine/scales";

export function RadiusPreview() {
  const global = useStore(globalTokens);

  return (
    <div className="mt-4">
      <h3 className="mb-3 text-sm font-semibold">Radius Scale</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Base: {global.radius}
      </p>
      <div className="flex flex-wrap gap-3">
        {Object.entries(RADIUS_MULTIPLIERS).map(([key, mult]) => (
          <div key={key} className="text-center">
            <div
              className="mb-1 h-12 w-12 border-2 border-primary bg-primary/10"
              style={{ borderRadius: `calc(${global.radius} * ${mult})` }}
            />
            <span className="text-[10px] text-muted-foreground">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
