export interface DashboardMetricSet {
  total: number;
  pendentes: number;
  processados: number;
  juntados: number;
  ultima_insercao?: string | null;
}

export interface DashboardData {
  metricas: {
    globais: DashboardMetricSet;
    maquina_usuario: DashboardMetricSet;
  };
  info_banco: {
    host: string;
    porta: number;
    database: string;
    usuario_banco: string;
    ip_cliente: string;
    usuario_logado: string;
  };
  siglas_orgaos: string[];
  erro?: string;
}

export interface PesquisaRegistro {
  [key: string]: string | number | boolean | null | undefined;
  id?: number;
  nuprocesso?: string;
  cpf?: string;
  sig_orgao?: string;
  ip_cliente?: string;
  usuario_logado?: string;
  data_inclusao_localizador?: string | null;
  data_processamento?: string | null;
  processado?: boolean | number;
  juntado?: boolean | number;
  localizado?: boolean | number;
}

export interface ListaResponse {
  filtros: Record<string, string>;
  siglas_orgaos: string[];
  usuarios_logados: string[];
  paginacao: {
    itens: PesquisaRegistro[];
    pagina: number;
    por_pagina: number;
    total: number;
    total_paginas: number;
    tem_anterior: boolean;
    tem_proxima: boolean;
    anterior_url: string;
    proxima_url: string;
  };
  erro?: string;
}

export interface DetalheResponse {
  registro?: PesquisaRegistro;
  erro?: string;
}

export interface ObservabilidadeResumo {
  total?: number;
  registros?: number;
  processos?: number;
  orgaos_ativos?: number;
  inclusoes?: number;
  inclusoes_registros?: number;
  inclusoes_processos?: number;
  processamentos?: number;
  processamentos_registros?: number;
  processamentos_processos?: number;
  processados?: number;
  processados_registros?: number;
  processados_processos?: number;
  juntados?: number;
  juntados_registros?: number;
  juntados_processos?: number;
}

export interface ObservabilidadeTotalPorOrgao {
  orgao: string;
  total?: number;
  registros?: number;
  processos?: number;
  processados?: number;
  juntados?: number;
  processados_registros?: number;
  processados_processos?: number;
  juntados_registros?: number;
  juntados_processos?: number;
}

export interface ObservabilidadePeriodo {
  selecionado: string;
  rotulo: string;
  inicio?: string | null;
  fim: string;
  granularidade_horas: number;
}

export interface ObservabilidadeResponse {
  periodo: ObservabilidadePeriodo;
  orgaos_disponiveis: string[];
  entrada_localizador_por_orgao: {
    resumo: ObservabilidadeResumo;
    totais_por_orgao: ObservabilidadeTotalPorOrgao[];
    evolucao: Array<Record<string, string | number>>;
  };
  inclusao_vs_processamento: {
    resumo: ObservabilidadeResumo;
    evolucao: Array<Record<string, string | number>>;
  };
  status_por_orgao: {
    resumo: ObservabilidadeResumo;
    totais_por_orgao: ObservabilidadeTotalPorOrgao[];
    evolucao: Array<Record<string, string | number>>;
  };
  erro?: string;
}
