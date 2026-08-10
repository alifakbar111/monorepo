import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dirty,
  markDirty,
  modifiedFiles,
  saveAll,
  saveError,
  saving,
} from "../src/store";

/** Stub `fetch` with a single JSON response. */
function mockJsonFetch(body: unknown, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  const fn = vi.fn(async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as unknown as Response,
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("saveAll", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    dirty.set(false);
    saving.set(false);
    saveError.set(null);
    modifiedFiles.set([]);
    markDirty();
  });

  it("marks clean and records modified files when the server reports ok", async () => {
    const modified = ["packages/shared-ui/src/components/button/button.css.ts"];
    mockJsonFetch({ ok: true, modified });

    const res = await saveAll();

    expect(res.ok).toBe(true);
    expect(dirty.get()).toBe(false);
    expect(saveError.get()).toBeNull();
    expect(modifiedFiles.get()).toEqual(modified);
    expect(saving.get()).toBe(false);
  });

  // Regression: handleSave used to call markClean() unconditionally, so a
  // server-side write failure was reported to the user as "saved".
  it("does NOT mark clean when the server reports a failure", async () => {
    mockJsonFetch({ ok: false, error: "ENOENT: no such file or directory" });

    const res = await saveAll();

    expect(res.ok).toBe(false);
    expect(dirty.get()).toBe(true);
    expect(saveError.get()).toBe("ENOENT: no such file or directory");
    expect(modifiedFiles.get()).toEqual([]);
    expect(saving.get()).toBe(false);
  });

  it("does NOT mark clean on a non-2xx response", async () => {
    mockJsonFetch({}, { status: 500 });

    const res = await saveAll();

    expect(res.ok).toBe(false);
    expect(dirty.get()).toBe(true);
    expect(saveError.get()).toContain("500");
  });

  it("does NOT mark clean when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const res = await saveAll();

    expect(res.ok).toBe(false);
    expect(dirty.get()).toBe(true);
    expect(saveError.get()).toContain("network down");
  });

  it("clears a previous error after a subsequent successful save", async () => {
    mockJsonFetch({ ok: false, error: "boom" });
    await saveAll();
    expect(saveError.get()).toBe("boom");

    markDirty();
    mockJsonFetch({ ok: true, modified: [] });
    await saveAll();

    expect(saveError.get()).toBeNull();
    expect(dirty.get()).toBe(false);
  });
});
