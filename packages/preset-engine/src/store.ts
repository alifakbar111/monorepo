import { atom } from "nanostores";
import type { ColorTokens, GlobalTokens } from "./engine/tokens";
import { generateColorsCss, generateGlobalCss } from "./engine/generate";
import { saveTokens } from "./api";
import type { SaveResponse } from "./api";

export const lightColors = atom<ColorTokens>({});
export const darkColors = atom<ColorTokens>({});
export const globalTokens = atom<GlobalTokens>({
  radius: "0.6rem",
  spacing: "0.25rem",
  fontSans: "",
  fontMono: "",
  fontHeading: "",
  fontHeadingUrl: "",
  fontBody: "",
  fontBodyUrl: "",
  fontMonoUrl: "",
  sidebarWidth: "16rem",
});
export const dirty = atom(false);
export const loading = atom(true);
export const saving = atom(false);
/** Error message from the last failed save, or null when the last save succeeded. */
export const saveError = atom<string | null>(null);
/** Repo-relative paths rewritten by the codemod during the last successful save. */
export const modifiedFiles = atom<string[]>([]);

export function markDirty() {
  dirty.set(true);
}

export function markClean() {
  dirty.set(false);
}

/**
 * Generate the CSS from the current tokens and persist it.
 *
 * Lives in the store (rather than in a component) so that the save state
 * — `saving` / `saveError` / `modifiedFiles` — stays the single source of
 * truth as the UI around it changes.
 *
 * The editor is only marked clean when the server confirms `ok: true`;
 * a failed save leaves `dirty` set and records the reason in `saveError`.
 */
export async function saveAll(): Promise<SaveResponse> {
  saving.set(true);
  try {
    const light = lightColors.get();
    const colorsCss = generateColorsCss(light, darkColors.get());
    const globalCss = generateGlobalCss(globalTokens.get(), light);
    const res = await saveTokens(colorsCss, globalCss);
    if (res.ok) {
      saveError.set(null);
      modifiedFiles.set(res.modified ?? []);
      markClean();
    } else {
      saveError.set(res.error ?? "save failed");
    }
    return res;
  } finally {
    saving.set(false);
  }
}
