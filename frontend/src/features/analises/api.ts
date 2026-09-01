import type { AnaliseRegistro, AnalisesPorRegistro } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { erro?: string };
  if (!response.ok) {
    throw new Error(payload.erro ?? `Falha HTTP ${response.status}`);
  }
  return payload;
}

export async function fetchAnalises(registroIds: Array<number | undefined>, ambiente: string): Promise<AnalisesPorRegistro> {
  const ids = [...new Set(registroIds.filter((id): id is number => typeof id === "number"))];
  if (!ids.length) {
    return {};
  }
  const params = new URLSearchParams({ ambiente, ids: ids.join(",") });
  const response = await fetch(`/api/analises/?${params}`);
  return (await parseJson<{ analises: AnalisesPorRegistro }>(response)).analises;
}

export async function saveAnalise(registroId: number, ambiente: string, changes: Partial<Pick<AnaliseRegistro, "analisado" | "anotacao">>): Promise<AnaliseRegistro> {
  const response = await fetch(`/api/analises/${registroId}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ambiente, ...changes }),
  });
  return (await parseJson<{ analise: AnaliseRegistro }>(response)).analise;
}
