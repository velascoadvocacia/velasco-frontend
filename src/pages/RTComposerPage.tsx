import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { API_BASE_URL } from "../lib/constants";
import { formatDate } from "../lib/format";
import type {
  ContratoTrabalhoCreatePayload,
  PessoaResponse,
  Processo,
  ProcessoCreatePayload,
  ProcessoAnexoResponse,
  TipoRescisao,
  Usuario
} from "../types/api";

type BlockId =
    | "qualificacao_reclamante"
    | "dados_reclamante"
    | "qualificacao_reclamada"
    | "contrato_aspectos_gerais"
    | "baixa_ctps_tutela"
    | "responsabilidade_subsidiaria"
    | "responsabilidade_subsidiaria_contrato_administrativo"
    | "baixa_ctps"
    | "responsabilidade_solidaria_grupo_economico"
    | "legitimidade_passiva_socios"
    | "grupo_economico"
    | "vinculo_sem_registro"
    | "horas_extras"
    | "intervalo"
    | "fgts"
    | "multa_fgts_40"
    | "multas_467_477"
    | "danos_verbas_rescisorias"
    | "danos_nao_anotacao_ctps"
    | "multa_convencional"
    | "acumulo_funcao"
    | "pagamento_por_fora"
    | "adicional_transferencia"
    | "periculosidade"
    | "acidente_trabalho"
    | "emissao_cat"
    | "danos_nao_emissao_cat"
    | "documentos";

const BLOCKS_FROM_API: BlockId[] = [
  "qualificacao_reclamante",
  "dados_reclamante",
  "qualificacao_reclamada",
  "contrato_aspectos_gerais",
  "baixa_ctps_tutela",
  "responsabilidade_solidaria_grupo_economico",
  "responsabilidade_subsidiaria",
  "responsabilidade_subsidiaria_contrato_administrativo",
  "legitimidade_passiva_socios"
];

const contractExtinctionOptions = [
  { value: "1", title: "Opção 1.1 – Dispensa sem justa causa" },
  { value: "2", title: "Opção 1.2 – Dispensa com justa causa" },
  { value: "3", title: "Opção 1.3 – Pedido de demissão" },
  { value: "4", title: "Opção 1.4 – Rescisão indireta" },
  { value: "5", title: "Opção 1.5 – Reversão do pedido de demissão - Nulidade" }
] as const;

interface ComposerState {
  advogadoIds: string[];
  claimantSearch: string;
  defendantSearch: string;
  claimantIds: string[];
  defendantIds: string[];
  funcao: string;
  dataAdmissao: string;
  dataDemissao: string;
  cidadePrestacao: string;
  descricaoAcidente: string;
  cctPeriodo: string;
  clausulaConvencional: string;
  assuntoClausula: string;
  redacaoClausula: string;
  salarioFuncaoOriginal: string;
  salarioFuncaoAcumulada: string;
  valorPagoPorFora: string;
  mediaHorasExtras: string;
  dataContratacao: string;
  funcaoContrato: string;
  remuneracao: string;
  motivoExtincao: "" | (typeof contractExtinctionOptions)[number]["value"];
  dataExtincao: string;
  informacoesComplementares: string;
  informacoesComplementaresCtps: string;
  descricaoAtividadePrincipal: string;
  objetoContratoAdministrativo: string;
  clausulaNumeroContrato: string;
  fornecimentoPrestadora: string;
}

interface BlockDefinition {
  id: BlockId;
  title: string;
  section: string;
}

interface PreviewBlock {
  id: BlockId;
  title: string;
  content: string;
  anexos: ProcessoAnexoResponse[];
}

function renderInlineMarkdown(text: string): ReactNode {
  const result: ReactNode[] = [];
  let plain = "";
  const flushPlain = () => {
    if (plain) {
      result.push(plain);
      plain = "";
    }
  };
  const markers = ["__***", "__**", "***", "**", "__", "*"] as const;

  for (let index = 0; index < text.length;) {
    const marker = markers.find((candidate) => text.startsWith(candidate, index));
    if (!marker) {
      plain += text[index++];
      continue;
    }
    const closing = marker === "__***" ? "***__" : marker === "__**" ? "**__" : marker;
    let end = text.indexOf(closing, index + marker.length);
    if (marker === "*") {
      while (end >= 0 && (text[end - 1] === "*" || text[end + 1] === "*")) {
        end = text.indexOf(closing, end + 1);
      }
    }
    if (end < 0) {
      plain += marker;
      index += marker.length;
      continue;
    }
    flushPlain();
    const inner = text.slice(index + marker.length, end);
    const content = renderInlineMarkdown(inner);
    const key = `${index}-${marker}-${end}`;
    if (marker === "__***") result.push(<u key={key}><strong><em>{content}</em></strong></u>);
    else if (marker === "__**") result.push(<u key={key}><strong>{content}</strong></u>);
    else if (marker === "***") result.push(<strong key={key}><em>{content}</em></strong>);
    else if (marker === "**") result.push(<strong key={key}>{content}</strong>);
    else if (marker === "__") result.push(<u key={key}>{content}</u>);
    else result.push(<em key={key}>{content}</em>);
    index = end + closing.length;
  }
  flushPlain();
  return result;
}

function normalizePreviewAttachments(value: unknown): ProcessoAnexoResponse[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      return [{
        id: index,
        processoId: 0,
        blocoId: "baixa_ctps_tutela",
        nomeOriginal: `Print da CTPS ${index + 1}`,
        contentType: "image/*",
        tamanhoBytes: 0,
        url: item,
        dataUpload: ""
      }];
    }
    if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
      return [item as ProcessoAnexoResponse];
    }
    return [];
  });
}

function renderBlockContent(content: string, anexos: ProcessoAnexoResponse[], renderAttachments: boolean) {
  const paragraphs = content.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  return paragraphs.map((paragraph, index) => (
    <Fragment key={`${paragraph}-${index}`}>
      <p>
        {paragraph.split("\n").map((line, lineIndex) => (
          <Fragment key={`${line}-${lineIndex}`}>
            {lineIndex > 0 ? <br /> : null}
            {renderInlineMarkdown(line)}
          </Fragment>
        ))}
      </p>
      {renderAttachments && index === 0 && anexos.length > 0 ? (
        <div className="rt-preview-attachments">
          {anexos.map((anexo) => (
            <img key={anexo.id} src={anexo.url} alt={anexo.nomeOriginal} />
          ))}
        </div>
      ) : null}
    </Fragment>
  ));
}

const initialState: ComposerState = {
  advogadoIds: [],
  claimantSearch: "",
  defendantSearch: "",
  claimantIds: [],
  defendantIds: [],
  funcao: "",
  dataAdmissao: "",
  dataDemissao: "",
  cidadePrestacao: "",
  descricaoAcidente: "",
  cctPeriodo: "",
  clausulaConvencional: "",
  assuntoClausula: "",
  redacaoClausula: "",
  salarioFuncaoOriginal: "",
  salarioFuncaoAcumulada: "",
  valorPagoPorFora: "",
  mediaHorasExtras: "",
  dataContratacao: "",
  funcaoContrato: "",
  remuneracao: "",
  motivoExtincao: "",
  dataExtincao: "",
  informacoesComplementares: "",
  informacoesComplementaresCtps: "",
  descricaoAtividadePrincipal: "",
  objetoContratoAdministrativo: "",
  clausulaNumeroContrato: "",
  fornecimentoPrestadora: ""
};

const blockDefinitions: BlockDefinition[] = [
  { id: "qualificacao_reclamante", title: "Qualificação do reclamante", section: "Dados iniciais" },
  { id: "qualificacao_reclamada", title: "Qualificação da reclamada", section: "Dados iniciais" },
  { id: "dados_reclamante", title: "Dados do(a) reclamante", section: "Dados iniciais" },
  { id: "contrato_aspectos_gerais", title: "Contrato de trabalho - Aspectos gerais", section: "Contrato de trabalho" },
  { id: "baixa_ctps_tutela", title: "Baixa na CTPS física. Tutela antecipada", section: "Tutela antecipada" },
  { id: "responsabilidade_solidaria_grupo_economico", title: "Responsabilidade solidária. Grupo econômico", section: "Responsabilidade" },
  { id: "legitimidade_passiva_socios", title: "Legitimidade passiva dos sócios das rés", section: "Responsabilidade" },
  { id: "responsabilidade_subsidiaria", title: "Responsabilidade subsidiária", section: "Responsabilidade" },
  { id: "responsabilidade_subsidiaria_contrato_administrativo", title: "Responsabilidade subsidiária. Contrato administrativo", section: "Responsabilidade" },
];

const defaultBlocks: BlockId[] = [
  "qualificacao_reclamante",
  "qualificacao_reclamada",
  "dados_reclamante"
];

function orderSelectedBlocks(selectedBlocks: BlockId[]) {
  return blockDefinitions
    .filter((block) => selectedBlocks.includes(block.id))
    .map((block) => block.id);
}

const variableFieldsByBlock: Partial<Record<BlockId, (keyof ComposerState)[]>> = {
  contrato_aspectos_gerais: [
    "dataContratacao",
    "funcaoContrato",
    "remuneracao",
    "motivoExtincao",
    "dataExtincao",
    "informacoesComplementares"
  ],
  baixa_ctps_tutela: ["dataExtincao", "informacoesComplementaresCtps"],
  responsabilidade_solidaria_grupo_economico: ["descricaoAtividadePrincipal"],
  responsabilidade_subsidiaria_contrato_administrativo: [
    "objetoContratoAdministrativo",
    "clausulaNumeroContrato",
    "fornecimentoPrestadora",
    "informacoesComplementares"
  ]
};

function blockTitle(block: BlockDefinition, values: ComposerState) {
  if (block.id !== "contrato_aspectos_gerais") return block.title;
  return contractExtinctionOptions.find((option) => option.value === values.motivoExtincao)?.title || block.title;
}

function buildVariablePayload(values: ComposerState, selectedBlocks: BlockId[]) {
  const keys = new Set(selectedBlocks.flatMap((blockId) => variableFieldsByBlock[blockId] ?? []));
  return Object.fromEntries(
    Array.from(keys).map((key) => [key, optional(String(values[key] ?? ""))])
  );
}

function selectedVariableValue(values: ComposerState, selectedBlocks: BlockId[], field: keyof ComposerState) {
  const payload = buildVariablePayload(values, selectedBlocks);
  return Object.prototype.hasOwnProperty.call(payload, field) ? optional(String(values[field] ?? "")) : null;
}

function optional(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function lowerIncludes(base: string, query: string) {
  return base.toLowerCase().includes(query.toLowerCase());
}

function formatAddress(person?: PessoaResponse) {
  if (!person?.endereco) return "endereço não informado";
  const parts = [
    person.endereco.logradouro,
    person.endereco.numero,
    person.endereco.bairro,
    person.endereco.cidade,
    person.endereco.estado,
    person.endereco.cep
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "endereço não informado";
}

function personLabel(person: PessoaResponse) {
  return person.razaoSocial || person.nome;
}

function parseUltimaRemuneracao(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function tipoRescisaoFromMotivo(motivo: ComposerState["motivoExtincao"]): TipoRescisao | null {
  const tipos: Partial<Record<NonNullable<ComposerState["motivoExtincao"]>, TipoRescisao>> = {
    "1": "SEM_JUSTA_CAUSA",
    "2": "COM_JUSTA_CAUSA",
    "3": "PEDIDO_DEMISSAO",
    "4": "RESCISAO_INDIRETA"
  };
  return tipos[motivo] || null;
}

function buildContratoTrabalhoPayload(values: ComposerState): ContratoTrabalhoCreatePayload {
  return {
    funcaoExercida: optional(values.funcaoContrato) || optional(values.funcao),
    dataAdmissao: optional(values.dataContratacao) || optional(values.dataAdmissao),
    dataDemissao: optional(values.dataExtincao) || optional(values.dataDemissao),
    ultimaRemuneracao: parseUltimaRemuneracao(values.remuneracao),
    localPrestacaoServico: optional(values.cidadePrestacao),
    tipoRescisao: tipoRescisaoFromMotivo(values.motivoExtincao)
  };
}

function mapProcessoToComposerValues(processo: Processo): ComposerState {
  const contrato = processo.contratoTrabalho;

  return {
    ...initialState,
    claimantIds: (processo.reclamantes?.length ? processo.reclamantes : [processo.cliente]).map((item) => String(item.id)),
    advogadoIds: (processo.advogados?.length ? processo.advogados : [processo.advogado]).map((item) => String(item.id)),
    defendantIds: processo.reclamadas.map((reclamada) => String(reclamada.id)),
    funcao: contrato?.funcaoExercida ?? "",
    dataAdmissao: contrato?.dataAdmissao ?? "",
    dataDemissao: contrato?.dataDemissao ?? "",
    cidadePrestacao: contrato?.localPrestacaoServico ?? "",
    descricaoAcidente: processo.rtDescricaoAcidente ?? "",
    cctPeriodo: processo.rtCctPeriodo ?? "",
    clausulaConvencional: processo.rtClausulaConvencional ?? "",
    assuntoClausula: processo.rtAssuntoClausula ?? "",
    redacaoClausula: processo.rtRedacaoClausula ?? "",
    salarioFuncaoOriginal: processo.rtSalarioFuncaoOriginal ?? "",
    salarioFuncaoAcumulada: processo.rtSalarioFuncaoAcumulada ?? "",
    valorPagoPorFora: processo.rtValorPagoPorFora ?? "",
    mediaHorasExtras: processo.rtMediaHorasExtras ?? ""
  };
}

async function getExportImageFiles(blocks: PreviewBlock[], pendingFilesByBlock: Partial<Record<BlockId, File[]>>) {
  const filesByBlock: Partial<Record<BlockId, File[]>> = {};
  for (const block of blocks) {
    if (!block.anexos.length && !pendingFilesByBlock[block.id]?.length) continue;
    filesByBlock[block.id] = [...(pendingFilesByBlock[block.id] || [])];
    for (const anexo of block.anexos) {
      const response = await fetch(anexo.url);
      if (!response.ok) throw new Error(`Não foi possível baixar o anexo ${anexo.nomeOriginal} para exportação.`);
      const blob = await response.blob();
      filesByBlock[block.id]!.push(new File([blob], anexo.nomeOriginal, { type: anexo.contentType || blob.type }));
    }
  }
  return filesByBlock;
}

export async function exportToDocx(previewBlocks: PreviewBlock[], claimantName: string, token: string, imageFilesByBlock: Partial<Record<BlockId, File[]>>) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify({
    claimantName,
    blocks: previewBlocks.map((block) => ({
      title: block.title,
      content: block.content,
      anexos: block.anexos.map((anexo) => ({
        url: anexo.url,
        contentType: anexo.contentType,
        nomeOriginal: anexo.nomeOriginal
      }))
    }))
  }));
  Object.entries(imageFilesByBlock).forEach(([blockId, files]) => {
    files?.forEach((file, index) => {
      const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      formData.append("arquivos", file, `anexo_${blockId}_${index}${extension}`);
    });
  });

  console.log(
      "[RT export] multipart fields:",
      Array.from(formData.entries()).map(([field, value]) => ({
        field,
        fileName: value instanceof File ? value.name : undefined,
        contentType: value instanceof File ? value.type : "application/json"
      }))
  );

  const response = await fetch(`${API_BASE_URL}/rt/export`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error("Falha ao exportar");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `RT - ${claimantName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPreviewBlocks(
    claimants: PessoaResponse[],
    defendants: PessoaResponse[],
    lawyers: Usuario[],
    values: ComposerState,
    selectedBlocks: BlockId[],
    apiPreviewTexts: Partial<Record<BlockId, string>>,
    apiPreviewTitles: Partial<Record<BlockId, string>>,
    apiPreviewAttachments: Partial<Record<BlockId, ProcessoAnexoResponse[]>>
): PreviewBlock[] {
  const claimantName = claimants.length
      ? claimants.map((item) => item.nome).join(", ")
      : "[reclamante]";
  const defendantNames = defendants.length
      ? defendants.map((item) => personLabel(item)).join(", ")
      : "[reclamada]";
  const dismissal = values.dataDemissao ? formatDate(values.dataDemissao) : "[data de demissão]";
  const city = optional(values.cidadePrestacao) || "[cidade/local]";
  const accident = optional(values.descricaoAcidente) || "[descrição do acidente]";
  const conventionalPeriod = optional(values.cctPeriodo) || "___";
  const conventionalClause = optional(values.clausulaConvencional) || "___";
  const conventionalSubject = optional(values.assuntoClausula) || "___";
  const conventionalText = optional(values.redacaoClausula) || "___";
  const accumulatedSalaryA = optional(values.salarioFuncaoOriginal) || "_____";
  const accumulatedSalaryB = optional(values.salarioFuncaoAcumulada) || "_____";
  const paidOutside = optional(values.valorPagoPorFora) || "_____";
  const averageExtra = optional(values.mediaHorasExtras) || "_____";
  const contentMap: Partial<Record<BlockId, string>> = {
    baixa_ctps: `Conquanto a parte autora tenha sido dispensada, não houve a devida baixa ou retificação da CTPS. Requer-se tutela para que a ré promova a anotação correta do contrato, considerando como data de término ${dismissal}, sob pena de multa diária e, em caso de descumprimento, a realização das anotações pela Secretaria da Vara.`,
    vinculo_sem_registro: `A prestação de serviços de ${claimantName} teve início antes do registro formal em CTPS, exercendo as mesmas funções e sob a mesma subordinação. Requer-se o reconhecimento do vínculo no período sem registro, com retificação da CTPS e pagamento dos consectários legais correspondentes.`,
    danos_nao_anotacao_ctps: `A ausência de anotação correta da CTPS sonegou direitos elementares à parte autora, atingindo sua dignidade e segurança social. Requer-se a condenação da parte ré ao pagamento de indenização por danos morais, nos termos do art. 5º, X, da Constituição Federal e dos arts. 186 e 927 do Código Civil.`,
    grupo_economico: `As empresas rés ${defendantNames} formam grupo econômico, aproveitando-se da mão de obra de ${claimantName} com comunhão de interesses e administração integrada. Requer-se a responsabilização solidária das rés, com fundamento no art. 2º, § 2º, da CLT.`,
    horas_extras: `${claimantName} laborava além da jornada contratual durante a prestação de serviços em ${city}, sem o correto pagamento das horas extras e de seus reflexos. Requer-se a condenação das rés ao pagamento das horas extraordinárias, adicional legal e reflexos em DSR, férias, 13º salário, FGTS e verbas rescisórias.`,
    intervalo: `Durante a contratualidade, a parte autora não usufruía integralmente do intervalo intrajornada legal. Requer-se a condenação da ré ao pagamento da indenização correspondente ao intervalo suprimido, com reflexos legais.`,
    fgts: `As rés deixaram de realizar corretamente os depósitos de FGTS ao longo do pacto laboral. Requer-se a apuração e pagamento das diferenças fundiárias, com apresentação dos extratos e reflexos nas parcelas decorrentes da extinção contratual.`,
    multa_fgts_40: `Com fundamento no art. 10, I, do ADCT, requer-se a condenação da ré ao pagamento da multa de 40% do FGTS, observando-se a totalidade das verbas que integram a base de cálculo.`,
    multas_467_477: `Diante do não pagamento tempestivo das verbas rescisórias, requer-se a condenação das rés ao pagamento das multas previstas nos arts. 467 e 477, § 8º, da CLT.`,
    danos_verbas_rescisorias: `A ausência de pagamento das verbas rescisórias gerou dano moral presumido à parte autora, por comprometer sua subsistência e dignidade. Requer-se a condenação da parte ré ao pagamento de indenização por danos morais em razão do inadimplemento rescisório.`,
    multa_convencional: `A cláusula ${conventionalClause} da CCT ${conventionalPeriod} prevê o seguinte: "${conventionalText}". Em razão do descumprimento relativo a ${conventionalSubject}, requer-se a condenação da parte ré ao pagamento da multa convencional, por cada cláusula violada e relativamente a cada instrumento coletivo aplicável.`,
    acumulo_funcao: `A parte autora acumulou funções distintas durante o contrato. Requer-se a condenação ao pagamento de diferenças salariais decorrentes do acúmulo de funções, correspondentes ao salário de ${accumulatedSalaryA} somado ao salário de ${accumulatedSalaryB}, ou, sucessivamente, plus salarial, com reflexos em horas extras, 13º salário, férias, aviso-prévio e FGTS.`,
    pagamento_por_fora: `A parte autora percebia parcela paga "por fora", em média mensal de R$ ${paidOutside}, sem integração à remuneração. Requer-se a integração do valor ao salário, com os devidos reflexos em RSR, férias + 1/3, 13º salário, FGTS + 40%, aviso-prévio, horas extras e demais verbas.`,
    adicional_transferencia: `Em razão de sucessivas e provisórias transferências no curso do pacto laboral, requer-se a condenação da ré ao pagamento do adicional de transferência, com reflexos em RSR, férias, 13º salário, FGTS, aviso-prévio, horas extras e adicionais correlatos.`,
    periculosidade: `As condições de trabalho expunham ${claimantName} a agentes ou situações perigosas, impondo-se a realização de perícia técnica e a condenação da parte ré ao pagamento do adicional de periculosidade, com reflexos em RSR, férias, 13º salário, FGTS + 40%, aviso-prévio, horas extras e adicional noturno.`,
    acidente_trabalho: `A parte autora sofreu acidente de trabalho quando ${accident}. Requer-se o reconhecimento do acidente e a condenação da ré nas reparações cabíveis, inclusive danos morais, observando-se o nexo causal e a responsabilidade aplicável ao caso concreto.`,
    emissao_cat: `Nos termos da Lei nº 8.213/91 e da regulamentação previdenciária aplicável, a ré estava obrigada a emitir a CAT. Requer-se seja reconhecida a ocorrência do acidente de trabalho e determinada a imediata emissão da CAT correspondente.`,
    danos_nao_emissao_cat: `A omissão patronal quanto à emissão da CAT configura ato ilícito e agrava a situação da parte autora. Requer-se a condenação da ré ao pagamento de indenização por danos morais em razão da não emissão da CAT.`,
    documentos: `Para a devida instrução dos autos, requer-se a juntada, pela ré, sob as penas do art. 400 do CPC, dos controles de jornada e tempo de direção, relatórios de GPS/rastreadores, holerites, extrato de FGTS, recibos de diárias, comprovantes de vale alimentação e TRCT, sob pena de confissão. Em especial, a média de horas extras de R$ ${averageExtra} deverá ser comprovada para fins de integração em verbas rescisórias.`
  };

  return selectedBlocks.map((id) => {
    const definition = blockDefinitions.find((item) => item.id === id)!;
    return {
      id,
      title: id === "contrato_aspectos_gerais"
        ? apiPreviewTitles[id] || blockTitle(definition, values)
        : definition.title,
      content: BLOCKS_FROM_API.includes(id) ? apiPreviewTexts[id] || "" : contentMap[id] || "",
      anexos: apiPreviewAttachments[id] || []
    };
  });
}

export function RTComposerPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get("processoId");
  const isEditing = Boolean(processoId);
  const [values, setValues] = useState<ComposerState>(initialState);
  const [people, setPeople] = useState<PessoaResponse[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<BlockId[]>(defaultBlocks);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingDocx, setExportingDocx] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [pendingCtpsFiles, setPendingCtpsFiles] = useState<File[]>([]);
  const [pendingResponsabilidadeFiles, setPendingResponsabilidadeFiles] = useState<File[]>([]);
  const [pendingContratoAdministrativoFiles, setPendingContratoAdministrativoFiles] = useState<File[]>([]);
  const [savedMessage, setSavedMessage] = useState("");
  const [existingProcesso, setExistingProcesso] = useState<Processo | null>(null);
  const [apiPreviews, setApiPreviews] = useState<Partial<Record<BlockId, {
    text: string;
    title: string;
    anexos: ProcessoAnexoResponse[];
    loading: boolean;
    error: string;
  }>>>({});
  const pendingCtpsPreviews = useMemo(
      () => pendingCtpsFiles.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file)
      })),
      [pendingCtpsFiles]
  );
  const pendingResponsabilidadePreviews = useMemo(
      () => pendingResponsabilidadeFiles.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file)
      })),
      [pendingResponsabilidadeFiles]
  );
  const pendingContratoAdministrativoPreviews = useMemo(
      () => pendingContratoAdministrativoFiles.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file)
      })),
      [pendingContratoAdministrativoFiles]
  );

  useEffect(() => () => {
    pendingCtpsPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingResponsabilidadePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingContratoAdministrativoPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [pendingCtpsPreviews, pendingResponsabilidadePreviews, pendingContratoAdministrativoPreviews]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!session) return;
      setLoading(true);
      setError("");

      if (!processoId) {
        setValues(initialState);
        setSelectedBlocks(defaultBlocks);
        setExistingProcesso(null);
        setApiPreviews({});
        setPendingCtpsFiles([]);
        setPendingResponsabilidadeFiles([]);
        setPendingContratoAdministrativoFiles([]);
        setSavedMessage("");
      }

      try {
        const [pessoas, usuarios, processo] = await Promise.all([
          api.getPessoas(session.token, 0, 300),
          api.getUsuarios(session.token, 0, 200),
          processoId
            ? api.getProcessoById(session.token, Number(processoId))
            : Promise.resolve(null)
        ]);

        if (cancelled) return;

        setPeople(pessoas.items);
        setUsers(usuarios.items);

        if (processo) {
          setExistingProcesso(processo);
          setValues(mapProcessoToComposerValues(processo));
          const blocosDerivados = blockDefinitions
            .filter((block) => processo.descricao.includes(block.title))
            .map((block) => block.id);
          setSelectedBlocks(blocosDerivados.length > 0 ? blocosDerivados : defaultBlocks);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar dados da RT.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [processoId, session]);

  const claimantOptions = useMemo(
      () =>
          values.claimantSearch.trim().length < 2
              ? []
              : people.filter(
                  (item) =>
                      item.tipoPessoa === "FISICA" &&
                      (lowerIncludes(item.nome, values.claimantSearch) ||
                          lowerIncludes(item.cpf || "", values.claimantSearch))
              ),
      [people, values.claimantSearch]
  );

  const defendantOptions = useMemo(
      () =>
          values.defendantSearch.trim().length < 2
              ? []
              : people.filter(
                  (item) =>
                      item.tipoPessoa === "JURIDICA" &&
                      (lowerIncludes(personLabel(item), values.defendantSearch) ||
                          lowerIncludes(item.cnpj || "", values.defendantSearch))
              ),
      [people, values.defendantSearch]
  );

  const lawyerOptions = useMemo(
      () => users.filter((item) => item.perfil === "ADVOGADO"),
      [users]
  );

  const lawyerSelectOptions = useMemo(
      () => lawyerOptions.map((item) => ({ id: String(item.id), label: item.pessoa?.nome || item.username })),
      [lawyerOptions]
  );

  const selectedLawyerOptions = lawyerSelectOptions.filter((option) => values.advogadoIds.includes(option.id));

  const selectedClaimants = people.filter((item) => values.claimantIds.includes(String(item.id)));
  const selectedDefendants = people.filter((item) => values.defendantIds.includes(String(item.id)));
  const selectedLawyers = lawyerOptions.filter((item) => values.advogadoIds.includes(String(item.id)));

  const orderedSelectedBlocks = useMemo(() => orderSelectedBlocks(selectedBlocks), [selectedBlocks]);
  const selectedApiBlocks = orderedSelectedBlocks.filter((block) => BLOCKS_FROM_API.includes(block));
  const apiBlocksForRequest = selectedApiBlocks;
  const apiPreviewDependencies = [
    selectedApiBlocks.join(","),
    ...values.claimantIds,
    ...values.defendantIds,
    ...values.advogadoIds,
    ...Object.entries(values).filter(([key]) => key !== "claimantSearch" && key !== "defendantSearch")
  ];

  useEffect(() => {
    if (!selectedApiBlocks.length) {
      setApiPreviews({});
      return;
    }

    if (!apiBlocksForRequest.length) return;

    if (!selectedClaimants.length && !selectedDefendants.length && !selectedLawyers.length) {
        setApiPreviews(Object.fromEntries(selectedApiBlocks.map((id) => [id, {
          text: "Selecione as partes e advogados para gerar a qualificação.",
          title: "",
          anexos: [],
          loading: false,
          error: ""
      }])));
      return;
    }

    if (!session) return;
    setApiPreviews((current) => ({
      ...current,
      ...Object.fromEntries(selectedApiBlocks.map((id) => [id, {
        text: current[id]?.text || "",
        title: current[id]?.title || "",
        anexos: current[id]?.anexos || [],
        loading: true,
        error: ""
      }]))
    }));
    const timer = window.setTimeout(() => {
      const payload = {
        ...(isEditing && processoId ? { processoId: Number(processoId) } : {}),
        reclamantesIds: values.claimantIds.map(Number),
        reclamadasIds: values.defendantIds.map(Number),
        advogadosIds: values.advogadoIds.map(Number),
        blocosSelecionados: apiBlocksForRequest,
        dadosVariaveis: buildVariablePayload(values, apiBlocksForRequest)
      };

      void api.previewRT(session.token, payload)
        .then((response) => {
          setApiPreviews((current) => ({
            ...current,
            ...Object.fromEntries(apiBlocksForRequest.map((id) => {
              const block = response.blocos.find((item) => item.id === id);
              return [id, {
                text: block?.texto || "Texto de qualificação não retornado pelo backend.",
                title: block?.titulo || "",
                anexos: normalizePreviewAttachments(block?.anexos),
                loading: false,
                error: ""
              }];
            }))
          }));
        })
        .catch((previewError) => {
          const error = previewError instanceof Error ? previewError.message : "Falha ao gerar a qualificação.";
          setApiPreviews((current) => ({
            ...current,
            ...Object.fromEntries(apiBlocksForRequest.map((id) => [id, {
              text: "",
              title: "",
              anexos: current[id]?.anexos || [],
              loading: false,
              error
            }]))
          }));
        });
    }, 500);

    return () => window.clearTimeout(timer);
    // The serialized dependency list tracks selected IDs and variable values without reacting to search text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, processoId, isEditing, apiPreviewDependencies.join("|")]);

  const apiPreviewTexts = selectedApiBlocks.reduce<Partial<Record<BlockId, string>>>((texts, id) => {
    const preview = apiPreviews[id];
    texts[id] = preview?.loading ? "Gerando texto..." : preview?.error || preview?.text || "";
    return texts;
  }, {});

  const apiPreviewTitles = selectedApiBlocks.reduce<Partial<Record<BlockId, string>>>((titles, id) => {
    titles[id] = apiPreviews[id]?.title || "";
    return titles;
  }, {});

  const apiPreviewAttachments = selectedApiBlocks.reduce<Partial<Record<BlockId, ProcessoAnexoResponse[]>>>((attachments, id) => {
    attachments[id] = apiPreviews[id]?.anexos || [];
    return attachments;
  }, {});

  const previewBlocks = useMemo(
      () => buildPreviewBlocks(selectedClaimants, selectedDefendants, selectedLawyers, values, orderedSelectedBlocks, apiPreviewTexts, apiPreviewTitles, apiPreviewAttachments),
      [selectedClaimants, selectedDefendants, selectedLawyers, values, orderedSelectedBlocks, apiPreviewTexts, apiPreviewTitles, apiPreviewAttachments]
  );

  function handleChange(field: keyof ComposerState, value: string | string[]) {
    setValues((current) => ({ ...current, [field]: value as never }));
  }

  function addClaimant(personId: number) {
    setValues((current) => ({
      ...current,
      claimantIds: current.claimantIds.includes(String(personId)) ? current.claimantIds : [...current.claimantIds, String(personId)],
      claimantSearch: ""
    }));
  }

  function removeClaimant(personId: number) {
    setValues((current) => ({
      ...current,
      claimantIds: current.claimantIds.filter((item) => item !== String(personId))
    }));
  }

  function addLawyer(userId: string) {
    setValues((current) => ({
      ...current,
      advogadoIds: current.advogadoIds.includes(userId) ? current.advogadoIds : [...current.advogadoIds, userId]
    }));
  }

  function removeLawyer(userId: string) {
    setValues((current) => ({
      ...current,
      advogadoIds: current.advogadoIds.filter((item) => item !== userId)
    }));
  }

  function addDefendant(personId: number) {
    setValues((current) => ({
      ...current,
      defendantIds: current.defendantIds.includes(String(personId))
          ? current.defendantIds
          : [...current.defendantIds, String(personId)],
      defendantSearch: ""
    }));
  }

  function removeDefendant(personId: number) {
    setValues((current) => ({
      ...current,
      defendantIds: current.defendantIds.filter((item) => item !== String(personId))
    }));
  }

  function toggleBlock(blockId: BlockId) {
    setSelectedBlocks((current) =>
        current.includes(blockId)
            ? current.filter((item) => item !== blockId)
            : [...current, blockId]
    );
  }

  type AttachmentBlockId = "baixa_ctps_tutela" | "responsabilidade_solidaria_grupo_economico" | "responsabilidade_subsidiaria_contrato_administrativo";

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>, blockId: AttachmentBlockId) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (!processoId) {
      if (blockId === "baixa_ctps_tutela") {
        setPendingCtpsFiles((current) => [...current, ...files]);
      } else if (blockId === "responsabilidade_solidaria_grupo_economico") {
        setPendingResponsabilidadeFiles((current) => [...current, ...files]);
      } else {
        setPendingContratoAdministrativoFiles((current) => [...current, ...files]);
      }
      return;
    }
    if (!session) return;

    setUploadingAttachments(true);
    setError("");
    try {
      const uploaded = await api.uploadProcessoAnexos(session.token, Number(processoId), files, blockId);
      setApiPreviews((current) => ({
        ...current,
        [blockId]: {
          text: current[blockId]?.text || "",
          title: current[blockId]?.title || "",
          anexos: [...(current[blockId]?.anexos || []), ...uploaded],
          loading: false,
          error: ""
        }
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha ao anexar os prints da CTPS.");
    } finally {
      setUploadingAttachments(false);
    }
  }

  async function handleAttachmentRemove(anexoId: number, blockId: AttachmentBlockId) {
    if (!session || !processoId) return;
    setError("");
    try {
      await api.deleteProcessoAnexo(session.token, Number(processoId), anexoId, blockId);
      setApiPreviews((current) => ({
        ...current,
        [blockId]: current[blockId] ? {
          ...current[blockId],
          anexos: current[blockId]!.anexos.filter((anexo) => anexo.id !== anexoId)
        } : current[blockId]
      }));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Falha ao remover o anexo.");
    }
  }

  function handlePendingAttachmentRemove(key: string) {
    setPendingCtpsFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingResponsabilidadeRemove(key: string) {
    setPendingResponsabilidadeFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingContratoAdministrativoRemove(key: string) {
    setPendingContratoAdministrativoFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function clearDraft() {
    setValues(initialState);
    setSelectedBlocks(defaultBlocks);
    setExistingProcesso(null);
    setApiPreviews({});
    setPendingCtpsFiles([]);
    setPendingResponsabilidadeFiles([]);
    setPendingContratoAdministrativoFiles([]);
    setSavedMessage("");
  }

  function buildProcessoPayload(): ProcessoCreatePayload {
    const descricao = previewBlocks.map((block) => `${block.title}\n${block.content}`).join("\n\n");

    if (isEditing && existingProcesso) {
      return {
        numeroProcesso: existingProcesso.numeroProcesso,
        descricao,
        clienteId: Number(values.claimantIds[0]),
        advogadoId: Number(values.advogadoIds[0]),
        dataAbertura: existingProcesso.dataAbertura,
        reclamadasIds: values.defendantIds.map(Number),
        status: existingProcesso.status,
        ativo: existingProcesso.ativo,
        contratoTrabalho: buildContratoTrabalhoPayload(values),
        estrategiaProcessual: existingProcesso.estrategiaProcessual
          ? {
              possuiGrupoEconomico: existingProcesso.estrategiaProcessual.possuiGrupoEconomico ?? false,
              possuiAcidenteTrabalho: existingProcesso.estrategiaProcessual.possuiAcidenteTrabalho ?? false,
              possuiDoencaOcupacional: existingProcesso.estrategiaProcessual.possuiDoencaOcupacional ?? false,
              requerEmissaoCat: existingProcesso.estrategiaProcessual.requerEmissaoCat ?? false
            }
          : {
              possuiGrupoEconomico: false,
              possuiAcidenteTrabalho: false,
              possuiDoencaOcupacional: false,
              requerEmissaoCat: false
            },
        rtDescricaoAcidente: selectedVariableValue(values, orderedSelectedBlocks, "descricaoAcidente"),
        rtCctPeriodo: selectedVariableValue(values, orderedSelectedBlocks, "cctPeriodo"),
        rtClausulaConvencional: selectedVariableValue(values, orderedSelectedBlocks, "clausulaConvencional"),
        rtAssuntoClausula: selectedVariableValue(values, orderedSelectedBlocks, "assuntoClausula"),
        rtRedacaoClausula: selectedVariableValue(values, orderedSelectedBlocks, "redacaoClausula"),
        rtSalarioFuncaoOriginal: selectedVariableValue(values, orderedSelectedBlocks, "salarioFuncaoOriginal"),
        rtSalarioFuncaoAcumulada: selectedVariableValue(values, orderedSelectedBlocks, "salarioFuncaoAcumulada"),
        rtValorPagoPorFora: selectedVariableValue(values, orderedSelectedBlocks, "valorPagoPorFora"),
        rtMediaHorasExtras: selectedVariableValue(values, orderedSelectedBlocks, "mediaHorasExtras"),
        advogadosIds: values.advogadoIds.map(Number),
        reclamantesIds: values.claimantIds.map(Number),
        blocosSelecionados: orderedSelectedBlocks,
        dadosVariaveis: buildVariablePayload(values, orderedSelectedBlocks)
      };
    }

    return {
      numeroProcesso: `RT-${Date.now()}`,
      descricao,
      clienteId: Number(values.claimantIds[0]),
      advogadoId: Number(values.advogadoIds[0]),
      dataAbertura: new Date().toISOString().split("T")[0],
      reclamadasIds: values.defendantIds.map(Number),
      status: "ABERTO",
      ativo: true,
      contratoTrabalho: buildContratoTrabalhoPayload(values),
      estrategiaProcessual: {
        possuiGrupoEconomico: false,
        possuiAcidenteTrabalho: false,
        possuiDoencaOcupacional: false,
        requerEmissaoCat: false
      },
      rtDescricaoAcidente: selectedVariableValue(values, orderedSelectedBlocks, "descricaoAcidente"),
      rtCctPeriodo: selectedVariableValue(values, orderedSelectedBlocks, "cctPeriodo"),
      rtClausulaConvencional: selectedVariableValue(values, orderedSelectedBlocks, "clausulaConvencional"),
      rtAssuntoClausula: selectedVariableValue(values, orderedSelectedBlocks, "assuntoClausula"),
      rtRedacaoClausula: selectedVariableValue(values, orderedSelectedBlocks, "redacaoClausula"),
      rtSalarioFuncaoOriginal: selectedVariableValue(values, orderedSelectedBlocks, "salarioFuncaoOriginal"),
      rtSalarioFuncaoAcumulada: selectedVariableValue(values, orderedSelectedBlocks, "salarioFuncaoAcumulada"),
      rtValorPagoPorFora: selectedVariableValue(values, orderedSelectedBlocks, "valorPagoPorFora"),
      rtMediaHorasExtras: selectedVariableValue(values, orderedSelectedBlocks, "mediaHorasExtras"),
      advogadosIds: values.advogadoIds.map(Number),
      reclamantesIds: values.claimantIds.map(Number),
      blocosSelecionados: orderedSelectedBlocks,
      dadosVariaveis: buildVariablePayload(values, orderedSelectedBlocks)
    };
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");
    setSavedMessage("");

    try {
      if (!session) throw new Error("Falha ao salvar RT.");

      const payload = buildProcessoPayload();
      let savedProcessoId: number;

      if (isEditing && processoId) {
        await api.updateProcesso(session.token, Number(processoId), payload);
        savedProcessoId = Number(processoId);
        setSavedMessage("RT atualizada com sucesso!");
      } else {
        const createdProcesso = await api.createProcesso(session.token, payload);
        savedProcessoId = createdProcesso.id;
        setSavedMessage("RT salva com sucesso!");
      }

      if (pendingCtpsFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingCtpsFiles);
        setPendingCtpsFiles([]);
      }
      if (pendingResponsabilidadeFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingResponsabilidadeFiles, "responsabilidade_solidaria_grupo_economico");
        setPendingResponsabilidadeFiles([]);
      }
      if (pendingContratoAdministrativoFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingContratoAdministrativoFiles, "responsabilidade_subsidiaria_contrato_administrativo");
        setPendingContratoAdministrativoFiles([]);
      }
      setUploadingAttachments(false);

      window.setTimeout(() => {
        clearDraft();
        navigate("/rt");
      }, 3000);
    } catch (saveError) {
      setUploadingAttachments(false);
      const message = saveError instanceof Error ? saveError.message : "Falha ao salvar RT.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExportDocx() {
    setExportingDocx(true);
    setError("");

    try {
      if (!session) throw new Error("Falha ao exportar");
      let blocksForExport = previewBlocks;
      if (processoId && selectedApiBlocks.length) {
        const latestPreview = await api.previewRT(session.token, {
          processoId: Number(processoId),
          reclamantesIds: values.claimantIds.map(Number),
          reclamadasIds: values.defendantIds.map(Number),
          advogadosIds: values.advogadoIds.map(Number),
          blocosSelecionados: apiBlocksForRequest,
          dadosVariaveis: buildVariablePayload(values, apiBlocksForRequest)
        });
        blocksForExport = previewBlocks.map((block) => {
          const latestBlock = latestPreview.blocos.find((item) => item.id === block.id);
          return latestBlock ? {
            ...block,
            title: latestBlock.titulo,
            content: latestBlock.texto,
            anexos: normalizePreviewAttachments(latestBlock.anexos)
          } : block;
        });
      }
      const imageFilesByBlock = await getExportImageFiles(blocksForExport, {
        baixa_ctps_tutela: pendingCtpsFiles,
        responsabilidade_solidaria_grupo_economico: pendingResponsabilidadeFiles,
        responsabilidade_subsidiaria_contrato_administrativo: pendingContratoAdministrativoFiles
      });
      await exportToDocx(blocksForExport, selectedClaimants.map((item) => item.nome).join(", ") || "reclamatoria", session.token, imageFilesByBlock);
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : "Falha ao exportar o documento.";
      setError(message);
    } finally {
      setExportingDocx(false);
    }
  }

  // Agrupa blocos por seção
  const blocksBySection = blockDefinitions.reduce((acc, block) => {
    (acc[block.section] ||= []).push(block);
    return acc;
  }, {} as Record<string, BlockDefinition[]>);

  return (
      <AppShell
          title={isEditing ? "Editar RT" : "Nova RT"}
          subtitle="Monte a reclamatória a partir do cadastro das partes e dos blocos reais do documento-base."
          actions={
            <div className="page-actions-cluster">
              {savedMessage ? <span className="draft-indicator">{savedMessage}</span> : null}
              <button
                  className="ghost-button ghost-button-light"
                  type="button"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={isSaving}
              >
                {isSaving ? "Salvando..." : isEditing ? "Atualizar RT" : "Salvar RT"}
              </button>
              <button
                  className="ghost-button ghost-button-light"
                  type="button"
                  onClick={() => {
                    void handleExportDocx();
                  }}
                  disabled={exportingDocx || previewBlocks.length === 0}
              >
                {exportingDocx ? "Exportando..." : "Exportar .docx"}
              </button>
              <button className="ghost-button ghost-button-light" type="button" onClick={clearDraft}>
                Limpar campos
              </button>
            </div>
          }
      >
        {loading ? (
            <div className="loading-panel">{isEditing ? "Carregando RT..." : "Carregando cadastro de partes..."}</div>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}

        {!loading ? (
            <div className="content-grid rt-grid">
              <div className="rt-builder-stack">

                {/* ── Partes principais ── */}
                <SectionCard
                    title="Partes principais"
                    description="Escolha o reclamante e adicione uma ou várias reclamadas."
                >
                  <div className="party-form">
                    <div className="form-grid">
                      <label>
                        Buscar reclamante
                        <input
                            value={values.claimantSearch}
                            onChange={(event) => handleChange("claimantSearch", event.target.value)}
                            placeholder="Nome ou CPF"
                        />
                      </label>

                      <div className="multi-picker-field">
                        <span>Advogados responsáveis</span>
                        <MultiSelectDropdown
                            options={lawyerSelectOptions}
                            selected={selectedLawyerOptions}
                            placeholder="Buscar advogado por nome"
                            onSelect={(option) => addLawyer(option.id)}
                            onRemove={removeLawyer}
                        />
                      </div>
                    </div>

                    <div className="entity-picker">
                      <div className="entity-results">
                        {claimantOptions.slice(0, 8).map((item) => (
                            <button
                                className="entity-card"
                                key={item.id}
                                type="button"
                                onClick={() => addClaimant(item.id)}
                            >
                              <strong>{item.nome}</strong>
                              <span>{item.cpf || "CPF não informado"}</span>
                              <span>{item.email}</span>
                            </button>
                        ))}
                      </div>
                    </div>

                    <div className="selected-entities-grid">
                      {selectedClaimants.map((item) => (
                          <div className="selected-summary-card" key={item.id}>
                            <strong>{item.nome}</strong>
                            <span>{item.cpf || "CPF não informado"}</span>
                            <p>{formatAddress(item)}</p>
                            <button className="inline-remove-button" type="button" onClick={() => removeClaimant(item.id)}>
                              Remover
                            </button>
                          </div>
                      ))}
                    </div>

                    <label>
                      Buscar reclamada
                      <input
                          value={values.defendantSearch}
                          onChange={(event) => handleChange("defendantSearch", event.target.value)}
                          placeholder="Razão social ou CNPJ"
                      />
                    </label>

                    <div className="entity-results">
                      {defendantOptions
                          .filter((item) => !values.defendantIds.includes(String(item.id)))
                          .slice(0, 8)
                          .map((item) => (
                              <button
                                  className="entity-card"
                                  key={item.id}
                                  type="button"
                                  onClick={() => addDefendant(item.id)}
                              >
                                <strong>{personLabel(item)}</strong>
                                <span>{item.cnpj || "CNPJ não informado"}</span>
                                <span>{formatAddress(item)}</span>
                              </button>
                          ))}
                    </div>

                    <div className="selected-entities-grid">
                      {selectedDefendants.map((item) => (
                          <div className="selected-summary-card" key={item.id}>
                            <strong>{personLabel(item)}</strong>
                            <span>{item.cnpj || "CNPJ não informado"}</span>
                            <p>{formatAddress(item)}</p>
                            <button className="inline-remove-button" type="button" onClick={() => removeDefendant(item.id)}>
                              Remover
                            </button>
                          </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* ── Blocos do documento ── */}
                <SectionCard
                    title="Blocos do documento"
                    description="Selecione os blocos que compõem esta RT, organizados por seção."
                >
                  <div className="text-block-grid wide">
                    {Object.entries(blocksBySection).map(([section, blocks]) => (
                        <div className="block-section-group" key={section}>
                          <div className="block-section-title">{section}</div>
                          {blocks.map((block) => (
                              <div className={`block-accordion ${selectedBlocks.includes(block.id) ? "is-open" : ""}`} key={block.id}>
                                <label className="checkbox-card stacked">
                                  <input
                                      type="checkbox"
                                      checked={selectedBlocks.includes(block.id)}
                                      onChange={() => toggleBlock(block.id)}
                                  />
                                  <div>
                                    <strong>{block.title}</strong>
                                  </div>
                                </label>
                                {block.id === "contrato_aspectos_gerais" ? (
                                    <label className="block-contract-option">
                                      Motivo da extinção do vínculo
                                      <select value={values.motivoExtincao} onChange={(event) => handleChange("motivoExtincao", event.target.value)}>
                                        <option value="">Selecione</option>
                                        {contractExtinctionOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.title}</option>
                                        ))}
                                      </select>
                                    </label>
                                ) : null}
                                {block.id === "baixa_ctps_tutela" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar print da CTPS"}</span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png"
                                            multiple
                                            disabled={uploadingAttachments}
                                            onChange={(event) => handleAttachmentUpload(event, "baixa_ctps_tutela")}
                                        />
                                      </label>
                                      {!processoId ? <small>Os prints serão enviados ao salvar a RT.</small> : null}
                                      {apiPreviews.baixa_ctps_tutela?.anexos.length || pendingCtpsPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.baixa_ctps_tutela?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "baixa_ctps_tutela")}>×</button>
                                                </div>
                                            ))}
                                            {pendingCtpsPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingAttachmentRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "responsabilidade_solidaria_grupo_economico" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar print de CNPJ, QSA e outros"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "responsabilidade_solidaria_grupo_economico")} />
                                      </label>
                                      {!processoId ? <small>Os prints serão enviados ao salvar a RT.</small> : null}
                                      {apiPreviews.responsabilidade_solidaria_grupo_economico?.anexos.length || pendingResponsabilidadePreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.responsabilidade_solidaria_grupo_economico?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "responsabilidade_solidaria_grupo_economico")}>×</button>
                                                </div>
                                            ))}
                                            {pendingResponsabilidadePreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingResponsabilidadeRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "responsabilidade_subsidiaria_contrato_administrativo" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar print do contrato administrativo"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "responsabilidade_subsidiaria_contrato_administrativo")} />
                                      </label>
                                      {!processoId ? <small>Os prints serão enviados ao salvar a RT.</small> : null}
                                      {apiPreviews.responsabilidade_subsidiaria_contrato_administrativo?.anexos.length || pendingContratoAdministrativoPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.responsabilidade_subsidiaria_contrato_administrativo?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "responsabilidade_subsidiaria_contrato_administrativo")}>×</button>
                                                </div>
                                            ))}
                                            {pendingContratoAdministrativoPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingContratoAdministrativoRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                <div className="block-accordion-content">
                                  <div className="form-grid block-variable-fields">
                                    {(variableFieldsByBlock[block.id] ?? []).filter((field) => field !== "motivoExtincao").map((field) => {
                                      const labels: Partial<Record<keyof ComposerState, string>> = {
                                        dataAdmissao: "Data de admissão",
                                        dataDemissao: "Data de demissão",
                                        descricaoAcidente: "Descrição do acidente",
                                        cctPeriodo: "Período da CCT",
                                        clausulaConvencional: "Cláusula convencional",
                                        assuntoClausula: "Assunto da cláusula",
                                        redacaoClausula: "Redação da cláusula",
                                        salarioFuncaoOriginal: "Salário da função original",
                                        salarioFuncaoAcumulada: "Salário/acréscimo da função acumulada",
                                        valorPagoPorFora: "Valor pago por fora",
                                        mediaHorasExtras: "Média de horas extras",
                                        dataContratacao: "Data de contratação",
                                        funcaoContrato: "Função exercida",
                                        remuneracao: "Última remuneração",
                                        motivoExtincao: "Motivo da extinção do vínculo",
                                        dataExtincao: "Data de extinção do vínculo",
                                        informacoesComplementares: "Informações complementares",
                                        informacoesComplementaresCtps: "Informações complementares",
                                        descricaoAtividadePrincipal: "Descrição da atividade principal",
                                        objetoContratoAdministrativo: "Objeto do contrato administrativo",
                                        clausulaNumeroContrato: "Cláusula e número do contrato",
                                        fornecimentoPrestadora: "O que é fornecido pela prestadora"
                                      };
                                      const multiline = ["descricaoAcidente", "redacaoClausula", "informacoesComplementares", "informacoesComplementaresCtps", "descricaoAtividadePrincipal"].includes(field);
                                      const isDate = ["dataAdmissao", "dataDemissao", "dataContratacao", "dataExtincao"].includes(field);
                                      return (
                                          <label className={["informacoesComplementares", "informacoesComplementaresCtps"].includes(field) ? "field-wide" : undefined} key={field}>
                                            {labels[field]}
                                            {multiline ? (
                                                <textarea rows={4} value={String(values[field] ?? "")} onChange={(event) => handleChange(field, event.target.value)} />
                                            ) : (
                                                <input
                                                    type={isDate ? "date" : field === "remuneracao" ? "number" : "text"}
                                                    step={field === "remuneracao" ? "0.01" : undefined}
                                                    min={field === "remuneracao" ? "0" : undefined}
                                                    value={String(values[field] ?? "")}
                                                    onChange={(event) => handleChange(field, event.target.value)}
                                                />
                                            )}
                                          </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                          ))}
                        </div>
                    ))}
                  </div>
                </SectionCard>

              </div>

              {/* ── Preview ── */}
              <SectionCard
                  title="Preview da RT"
                  description="Pré-visualização por blocos. O próximo passo é converter exatamente isso para `.docx`."
              >
                <article className="rt-preview">
                  <h3>Reclamatória Trabalhista</h3>
                  {previewBlocks.map((block) => (
                      <section className="rt-preview-block" key={block.id}>
                        <h4>{block.title}</h4>
                        {renderBlockContent(block.content, block.anexos, [
                          "baixa_ctps_tutela",
                          "responsabilidade_solidaria_grupo_economico",
                          "responsabilidade_subsidiaria_contrato_administrativo"
                        ].includes(block.id))}
                      </section>
                  ))}
                </article>
              </SectionCard>
            </div>
        ) : null}
      </AppShell>
  );
}
