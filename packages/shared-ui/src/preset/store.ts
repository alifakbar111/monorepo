import { atom } from "nanostores";
import type { Preset } from "../../scripts/types";

export const workingPreset = atom<Preset | null>(null);
export const dirty = atom(false);
export const saving = atom(false);
export const lastReport = atom<{ changed: number; untokenized: string[]; bytes: number } | null>(null);
export const previewStyle = atom("");

export function setPreset(p: Preset) {
	workingPreset.set(p);
	dirty.set(false);
}
