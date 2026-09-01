export interface AnaliseRegistro {
  analisado: boolean;
  anotacao: string;
  updated_at?: string | null;
}

export type AnalisesPorRegistro = Record<string, AnaliseRegistro>;

export const ANALISE_PADRAO: AnaliseRegistro = {
  analisado: false,
  anotacao: "",
  updated_at: null,
};
