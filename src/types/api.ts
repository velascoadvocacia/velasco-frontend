export type PerfilUsuario = "ADMIN" | "ADVOGADO" | "ASSISTENTE";
export type TipoPessoa = "FISICA" | "JURIDICA";
export type StatusProcesso = "ABERTO" | "EM_ANDAMENTO" | "FINALIZADO";

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface PessoaResumo {
  id: number;
  nome: string;
  tipoPessoa: TipoPessoa;
}

export interface EnderecoResponse {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface PessoaResponse {
  id: number;
  nome: string;
  cpf?: string | null;
  cnpj?: string | null;
  email: string;
  telefone?: string | null;
  nacionalidade?: string | null;
  estadoCivil?: string | null;
  rg?: string | null;
  orgaoEmissorRg?: string | null;
  pis?: string | null;
  nomeMae?: string | null;
  profissao?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  inscricaoEstadual?: string | null;
  tipoPessoa: TipoPessoa;
  dataNascimento?: string | null;
  endereco?: EnderecoResponse | null;
  observacoes?: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Usuario {
  id: number;
  username: string;
  pessoa: PessoaResumo;
  perfil: PerfilUsuario;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioCreatePayload {
  username: string;
  senha: string;
  pessoaId: number;
  perfil: PerfilUsuario;
  ativo?: boolean;
}

export interface AuthLoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}

export type TipoRescisao =
  | "SEM_JUSTA_CAUSA"
  | "COM_JUSTA_CAUSA"
  | "PEDIDO_DEMISSAO"
  | "RESCISAO_INDIRETA"
  | "ACORDO"
  | "NAO_APLICAVEL";

export type TipoResponsabilidade =
  | "DIRETA"
  | "SOLIDARIA"
  | "SUBSIDIARIA"
  | "SOLIDARIA_E_SUBSIDIARIA"
  | "NAO_DEFINIDA";

export interface ContratoTrabalhoResponse {
  funcaoExercida?: string | null;
  dataAdmissao?: string | null;
  dataDemissao?: string | null;
  tipoRescisao?: TipoRescisao | null;
  ultimaRemuneracao?: number | null;
  avisoPrevioProjetadoEm?: string | null;
  jornadaDescricao?: string | null;
  localPrestacaoServico?: string | null;
}

export interface EstrategiaProcessualResponse {
  fundamentosFaticos?: string | null;
  pedidosPrincipais?: string | null;
  observacoesInternas?: string | null;
  responsabilidadePretendida?: TipoResponsabilidade | null;
  possuiGrupoEconomico?: boolean;
  possuiAcidenteTrabalho?: boolean;
  possuiDoencaOcupacional?: boolean;
  requerEmissaoCat?: boolean;
  valorCausa?: number | null;
}

export interface ProcessoResumo {
  id: number;
  numeroProcesso: string;
  status: StatusProcesso;
}

export interface MovimentacaoResumo {
  id: number;
  descricao: string;
  dataMovimentacao: string;
}

export interface MovimentacaoResponse {
  id: number;
  processo: ProcessoResumo;
  descricao: string;
  dataMovimentacao: string;
}

export interface Processo {
  id: number;
  numeroProcesso: string;
  descricao: string;
  reclamante: PessoaResumo;
  advogadoResponsavel: PessoaResumo;
  cliente: PessoaResumo;
  advogado: PessoaResumo;
  reclamadas: PessoaResumo[];
  sociosResponsaveis: PessoaResumo[];
  dataAbertura: string;
  contratoTrabalho?: ContratoTrabalhoResponse | null;
  estrategiaProcessual?: EstrategiaProcessualResponse | null;
  status: StatusProcesso;
  ativo: boolean;
  rtDescricaoAcidente?: string | null;
  rtCctPeriodo?: string | null;
  rtClausulaConvencional?: string | null;
  rtAssuntoClausula?: string | null;
  rtRedacaoClausula?: string | null;
  rtSalarioFuncaoOriginal?: string | null;
  rtSalarioFuncaoAcumulada?: string | null;
  rtValorPagoPorFora?: string | null;
  rtMediaHorasExtras?: string | null;
  createdAt: string;
  updatedAt: string;
  movimentacoes: MovimentacaoResumo[];
}

export interface JwtPayload {
  sub?: string;
  upn?: string;
  exp?: number;
  iat?: number;
  groups?: string[];
  perfil?: PerfilUsuario;
  pessoaId?: number;
}

export interface PartyProcessLink {
  id: number;
  numeroProcesso: string;
  descricao: string;
  status: StatusProcesso;
  clienteNome: string;
  advogadoNome: string;
  dataAbertura: string;
}

export interface PartySummary {
  pessoa: PessoaResumo;
  totalProcessos: number;
  processos: PartyProcessLink[];
}

export interface EnderecoRequestPayload {
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface PessoaCreatePayload {
  nome: string;
  cpf?: string | null;
  cnpj?: string | null;
  email: string;
  telefone?: string | null;
  nacionalidade?: string | null;
  estadoCivil?: string | null;
  rg?: string | null;
  orgaoEmissorRg?: string | null;
  pis?: string | null;
  nomeMae?: string | null;
  profissao?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  inscricaoEstadual?: string | null;
  tipoPessoa: TipoPessoa;
  dataNascimento?: string | null;
  endereco?: EnderecoRequestPayload | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export interface ContratoTrabalhoCreatePayload {
  funcaoExercida?: string | null;
  dataAdmissao?: string | null;
  dataDemissao?: string | null;
  tipoRescisao?: TipoRescisao | null;
  ultimaRemuneracao?: number | null;
  avisoPrevioProjetadoEm?: string | null;
  jornadaDescricao?: string | null;
  localPrestacaoServico?: string | null;
}

export interface EstrategiaProcessualCreatePayload {
  fundamentosFaticos?: string | null;
  pedidosPrincipais?: string | null;
  observacoesInternas?: string | null;
  responsabilidadePretendida?: TipoResponsabilidade | null;
  possuiGrupoEconomico?: boolean;
  possuiAcidenteTrabalho?: boolean;
  possuiDoencaOcupacional?: boolean;
  requerEmissaoCat?: boolean;
  valorCausa?: number | null;
}

export interface ProcessoCreatePayload {
  numeroProcesso: string;
  descricao: string;
  clienteId: number;
  advogadoId: number;
  dataAbertura: string;
  contratoTrabalho?: ContratoTrabalhoCreatePayload | null;
  estrategiaProcessual?: EstrategiaProcessualCreatePayload | null;
  reclamadasIds?: number[];
  sociosResponsaveisIds?: number[];
  status: StatusProcesso;
  ativo?: boolean;
  rtDescricaoAcidente?: string | null;
  rtCctPeriodo?: string | null;
  rtClausulaConvencional?: string | null;
  rtAssuntoClausula?: string | null;
  rtRedacaoClausula?: string | null;
  rtSalarioFuncaoOriginal?: string | null;
  rtSalarioFuncaoAcumulada?: string | null;
  rtValorPagoPorFora?: string | null;
  rtMediaHorasExtras?: string | null;
}

export type ProcessoUpdatePayload = ProcessoCreatePayload;
