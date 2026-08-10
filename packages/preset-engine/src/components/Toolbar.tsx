import { useStore } from "@nanostores/react";
import { dirty, modifiedFiles, saveAll, saveError, saving } from "../store";

export function Toolbar() {
  const isDirty = useStore(dirty);
  const isSaving = useStore(saving);
  const error = useStore(saveError);
  const modified = useStore(modifiedFiles);

  async function handleSave() {
    await saveAll();
  }

  return (
    <div className="preset-toolbar">
      <span className="text-sm font-semibold">Preset Engine</span>
      <span className="text-xs text-muted-foreground">
        {isDirty ? "● unsaved changes" : "saved"}
      </span>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          ● save failed: {error}
        </span>
      ) : modified.length > 0 ? (
        <span className="text-xs text-muted-foreground">
          codemod updated {modified.length} file
          {modified.length === 1 ? "" : "s"}
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <button
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
