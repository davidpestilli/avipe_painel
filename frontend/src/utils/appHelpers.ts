export type RouteView = "home" | "lista" | "detalhe" | "configuracoes";

export function getViewFromPath(pathname: string): RouteView {
  if (pathname.startsWith("/pesquisas/detalhe/")) {
    return "detalhe";
  }
  if (pathname.startsWith("/pesquisas/")) {
    return "lista";
  }
  if (pathname.startsWith("/configuracoes/")) {
    return "configuracoes";
  }
  return "home";
}

export function applyFiltersFromParams<FilterKey extends string>(
  params: URLSearchParams,
  keys: readonly FilterKey[],
  emptyFilters: Record<FilterKey, string>,
) {
  const next = { ...emptyFilters };
  for (const key of keys) {
    next[key] = params.get(key) ?? "";
  }
  return next;
}

export function buildQueryString<FilterKey extends string>(state: Record<FilterKey, string>, keys: readonly FilterKey[], page?: number) {
  const params = new URLSearchParams();

  for (const key of keys) {
    const value = state[key].trim();
    if (value) {
      params.set(key, value);
    }
  }

  if (page && page > 1) {
    params.set("pagina", String(page));
  }

  return params.toString();
}

export function navigateTo(pathname: string, queryString = "") {
  const target = `${pathname}${queryString ? `?${queryString}` : ""}`;
  window.history.pushState({}, "", target);
}

export function formatText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export function formatDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

export function formatBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (value === 1 || value === "1") {
    return "Sim";
  }
  if (value === 0 || value === "0") {
    return "Não";
  }
  return formatText(value);
}

export function normalizeProcessKey(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || "__SEM_PROCESSO__";
}

export function countDistinctProcesses<T>(items: T[], getProcessValue: (item: T) => unknown) {
  return new Set(items.map((item) => normalizeProcessKey(getProcessValue(item)))).size;
}
