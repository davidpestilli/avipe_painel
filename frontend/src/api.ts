import type { DashboardData, DetalheResponse, ListaResponse } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "erro" in payload ? String(payload.erro) : `Falha HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard/");
  return parseJson<DashboardData>(response);
}

export async function fetchLista(queryString = ""): Promise<ListaResponse> {
  const suffix = queryString ? `?${queryString}` : "";
  const response = await fetch(`/api/pesquisas/${suffix}`);
  return parseJson<ListaResponse>(response);
}

export async function fetchDetalhe(id: string): Promise<DetalheResponse> {
  const response = await fetch(`/api/pesquisas/detalhe/?id=${encodeURIComponent(id)}`);
  return parseJson<DetalheResponse>(response);
}
