import type { ConfiguracoesResponse, DashboardData, DetalheResponse, ListaResponse, ObservabilidadeResponse } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "erro" in payload ? String(payload.erro) : `Falha HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function withAmbiente(path: string, ambiente: string, extraParams?: URLSearchParams) {
  const params = extraParams ?? new URLSearchParams();
  if (ambiente) {
    params.set("ambiente", ambiente);
  }
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

export async function fetchDashboard(ambiente: string): Promise<DashboardData> {
  const response = await fetch(withAmbiente("/api/dashboard/", ambiente));
  return parseJson<DashboardData>(response);
}

export async function fetchConfiguracoes(ambiente: string): Promise<ConfiguracoesResponse> {
  const response = await fetch(withAmbiente("/api/configuracoes/", ambiente));
  return parseJson<ConfiguracoesResponse>(response);
}

export async function fetchObservabilidade(periodo: string, ambiente: string): Promise<ObservabilidadeResponse> {
  const params = new URLSearchParams({ periodo });
  const response = await fetch(withAmbiente("/api/observabilidade/", ambiente, params));
  return parseJson<ObservabilidadeResponse>(response);
}

export async function fetchLista(queryString = "", ambiente: string): Promise<ListaResponse> {
  const params = new URLSearchParams(queryString);
  const response = await fetch(withAmbiente("/api/pesquisas/", ambiente, params));
  return parseJson<ListaResponse>(response);
}

export async function fetchDetalhe(id: string, ambiente: string): Promise<DetalheResponse> {
  const params = new URLSearchParams({ id });
  const response = await fetch(withAmbiente("/api/pesquisas/detalhe/", ambiente, params));
  return parseJson<DetalheResponse>(response);
}
