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
  ultimos_registros: PesquisaRegistro[];
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
