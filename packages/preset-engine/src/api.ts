export interface TokensResponse {
  ok: boolean;
  colors?: string;
  global?: string;
  error?: string;
}

export interface SaveResponse {
  ok: boolean;
  /** Repo-relative paths of *.css.ts files rewritten by the codemod. */
  modified?: string[];
  error?: string;
}

export async function fetchTokens(): Promise<TokensResponse> {
  const res = await fetch("/api/tokens");
  return res.json();
}

export async function saveTokens(
  colors: string,
  global: string,
): Promise<SaveResponse> {
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ colors, global }),
    });
    if (!res.ok) {
      return { ok: false, error: `save failed: HTTP ${res.status}` };
    }
    return (await res.json()) as SaveResponse;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
