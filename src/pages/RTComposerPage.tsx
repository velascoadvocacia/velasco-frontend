import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { API_BASE_URL } from "../lib/constants";
import { formatDate } from "../lib/format";
import type {
  ContratoTrabalhoCreatePayload,
  PessoaResponse,
  Processo,
  ProcessoCreatePayload,
  TipoRescisao,
  Usuario
} from "../types/api";

type BlockId =
    | "qualificacao_reclamante"
    | "qualificacao_reclamada"
    | "contrato_dispensa_sem_justa"
    | "contrato_dispensa_com_justa"
    | "contrato_pedido_demissao"
    | "contrato_rescisao_indireta"
    | "reversao_justa_causa"
    | "baixa_ctps"
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

interface ComposerState {
  advogadoId: string;
  claimantSearch: string;
  defendantSearch: string;
  claimantId: string;
  defendantIds: string[];
  funcao: string;
  dataAdmissao: string;
  dataDemissao: string;
  salario: string;
  cidadePrestacao: string;
  tipoRescisao: TipoRescisao | "";
  descricaoAcidente: string;
  cctPeriodo: string;
  clausulaConvencional: string;
  assuntoClausula: string;
  redacaoClausula: string;
  salarioFuncaoOriginal: string;
  salarioFuncaoAcumulada: string;
  valorPagoPorFora: string;
  mediaHorasExtras: string;
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
}

const initialState: ComposerState = {
  advogadoId: "",
  claimantSearch: "",
  defendantSearch: "",
  claimantId: "",
  defendantIds: [],
  funcao: "",
  dataAdmissao: "",
  dataDemissao: "",
  salario: "",
  cidadePrestacao: "",
  tipoRescisao: "",
  descricaoAcidente: "",
  cctPeriodo: "",
  clausulaConvencional: "",
  assuntoClausula: "",
  redacaoClausula: "",
  salarioFuncaoOriginal: "",
  salarioFuncaoAcumulada: "",
  valorPagoPorFora: "",
  mediaHorasExtras: ""
};

const RT_DRAFT_STORAGE_KEY = "velasco.rt-composer-draft";

const blockDefinitions: BlockDefinition[] = [
  { id: "qualificacao_reclamante", title: "Qualificação do reclamante", section: "Dados iniciais" },
  { id: "qualificacao_reclamada", title: "Qualificação da reclamada", section: "Dados iniciais" },
  { id: "contrato_dispensa_sem_justa", title: "Dispensa sem justa causa", section: "Contrato de trabalho" },
  { id: "contrato_dispensa_com_justa", title: "Dispensa com justa causa", section: "Contrato de trabalho" },
  { id: "contrato_pedido_demissao", title: "Pedido de demissão", section: "Contrato de trabalho" },
  { id: "contrato_rescisao_indireta", title: "Rescisão indireta", section: "Contrato de trabalho" },
  { id: "reversao_justa_causa", title: "Reversão da justa causa", section: "Contrato de trabalho" },
  { id: "baixa_ctps", title: "Baixa / anotação na CTPS", section: "CTPS e vínculo" },
  { id: "vinculo_sem_registro", title: "Vínculo sem registro", section: "CTPS e vínculo" },
  { id: "danos_nao_anotacao_ctps", title: "Dano moral por não anotação da CTPS", section: "CTPS e vínculo" },
  { id: "grupo_economico", title: "Grupo econômico", section: "Responsabilidade" },
  { id: "horas_extras", title: "Horas extras", section: "Jornada" },
  { id: "intervalo", title: "Intervalo intrajornada", section: "Jornada" },
  { id: "fgts", title: "Diferenças de FGTS", section: "Verbas e reflexos" },
  { id: "multa_fgts_40", title: "Multa de 40% do FGTS", section: "Verbas e reflexos" },
  { id: "multas_467_477", title: "Multas dos arts. 467 e 477", section: "Verbas e reflexos" },
  { id: "danos_verbas_rescisorias", title: "Dano moral por verbas rescisórias", section: "Verbas e reflexos" },
  { id: "multa_convencional", title: "Multa convencional", section: "Normas coletivas" },
  { id: "acumulo_funcao", title: "Acúmulo de função", section: "Diferenças salariais" },
  { id: "pagamento_por_fora", title: "Pagamento por fora", section: "Diferenças salariais" },
  { id: "adicional_transferencia", title: "Adicional de transferência", section: "Diferenças salariais" },
  { id: "periculosidade", title: "Adicional de periculosidade", section: "Adicionais" },
  { id: "acidente_trabalho", title: "Acidente de trabalho", section: "Acidente / CAT" },
  { id: "emissao_cat", title: "Obrigatoriedade de emissão da CAT", section: "Acidente / CAT" },
  { id: "danos_nao_emissao_cat", title: "Dano moral por não emissão da CAT", section: "Acidente / CAT" },
  { id: "documentos", title: "Apresentação de documentos", section: "Pedidos finais" }
];

const defaultBlocks: BlockId[] = [
  "qualificacao_reclamante",
  "qualificacao_reclamada",
  "contrato_dispensa_sem_justa",
  "documentos"
];

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

function buildContratoTrabalhoPayload(values: ComposerState): ContratoTrabalhoCreatePayload {
  return {
    funcaoExercida: optional(values.funcao),
    dataAdmissao: optional(values.dataAdmissao),
    dataDemissao: optional(values.dataDemissao),
    ultimaRemuneracao: parseUltimaRemuneracao(values.salario),
    localPrestacaoServico: optional(values.cidadePrestacao),
    tipoRescisao: values.tipoRescisao || null
  };
}

function mapProcessoToComposerValues(processo: Processo): ComposerState {
  const contrato = processo.contratoTrabalho;

  return {
    ...initialState,
    claimantId: String(processo.cliente.id),
    advogadoId: String(processo.advogado.id),
    defendantIds: processo.reclamadas.map((reclamada) => String(reclamada.id)),
    funcao: contrato?.funcaoExercida ?? "",
    dataAdmissao: contrato?.dataAdmissao ?? "",
    dataDemissao: contrato?.dataDemissao ?? "",
    salario: contrato?.ultimaRemuneracao != null ? String(contrato.ultimaRemuneracao) : "",
    cidadePrestacao: contrato?.localPrestacaoServico ?? "",
    tipoRescisao: contrato?.tipoRescisao ?? "",
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

export async function exportToDocx(previewBlocks: PreviewBlock[], claimantName: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/rt/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      claimantName,
      blocks: previewBlocks
    })
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
    claimant: PessoaResponse | undefined,
    defendants: PessoaResponse[],
    lawyer: Usuario | undefined,
    values: ComposerState,
    selectedBlocks: BlockId[]
): PreviewBlock[] {
  const claimantName = claimant?.nome || "[reclamante]";
  const defendantNames = defendants.length
      ? defendants.map((item) => personLabel(item)).join(", ")
      : "[reclamada]";
  const lawyerName = lawyer?.pessoa.nome || "[advogado]";
  const claimantAddress = formatAddress(claimant);
  const functionName = optional(values.funcao) || claimant?.profissao || "[função]";
  const admission = values.dataAdmissao ? formatDate(values.dataAdmissao) : "[data de admissão]";
  const dismissal = values.dataDemissao ? formatDate(values.dataDemissao) : "[data de demissão]";
  const salary = optional(values.salario) || "[salário]";
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
  const tipoRescisaoTexto: Record<string, string> = {
    SEM_JUSTA_CAUSA: "dispensa sem justa causa",
    COM_JUSTA_CAUSA: "dispensa com justa causa",
    PEDIDO_DEMISSAO: "pedido de demissão",
    RESCISAO_INDIRETA: "rescisão indireta",
    ACORDO: "acordo",
    NAO_APLICAVEL: "não aplicável"
  };
  const tipoRescisao = tipoRescisaoTexto[values.tipoRescisao] || "[modalidade de rescisão]";

  const contentMap: Record<BlockId, string> = {
    qualificacao_reclamante: `${claimantName}, brasileiro(a), ${claimant?.estadoCivil?.toLowerCase() || "estado civil não informado"}, ${functionName}, residente e domiciliado(a) em ${claimantAddress}, CPF nº ${claimant?.cpf || "não informado"}, RG nº ${claimant?.rg || "não informado"}, PIS ${claimant?.pis || "não informado"}, por seus procuradores ${lawyerName}, ajuíza a presente reclamatória trabalhista.`,
    qualificacao_reclamada: defendants.length
        ? defendants.map((item) => `${personLabel(item)}, pessoa jurídica de direito privado, CNPJ nº ${item.cnpj || "não informado"}, com endereço à ${formatAddress(item)}.`).join(" ")
        : "____, pessoa jurídica de direito privado, CNPJ nº ___, com endereço completo, pelas razões de fato e de direito a seguir expostas.",
    contrato_dispensa_sem_justa: `${claimantName} foi admitido(a) em ${admission} para exercer a função de ${functionName}, percebendo última remuneração de ${salary}. Ao final do pacto laboral, foi dispensado(a) sem justa causa em ${dismissal}, sem receber corretamente as verbas rescisórias. Pelo exposto, requer-se a condenação da ré ao pagamento de saldo salarial, aviso-prévio, 13º proporcional, férias com 1/3, FGTS com multa de 40% e liberação das guias competentes.`,
    contrato_dispensa_com_justa: `A parte autora teve aplicada justa causa em ${dismissal}. Contudo, a penalidade se mostra inválida diante da ausência de proporcionalidade e de prova robusta. Requer-se a declaração de nulidade da justa causa, com conversão para dispensa sem justa causa e pagamento das verbas correspondentes.`,
    contrato_pedido_demissao: `${claimantName} formalizou pedido de demissão em ${dismissal}, embora o contexto contratual revele vícios e descumprimentos patronais que impõem análise judicial da modalidade extintiva, com o consequente pagamento das parcelas cabíveis.`,
    contrato_rescisao_indireta: `O contrato mantido entre ${claimantName} e ${defendantNames} foi rompido por faltas patronais graves, notadamente descumprimentos contratuais reiterados. Requer-se o reconhecimento da rescisão indireta, com condenação ao pagamento de aviso-prévio, férias integrais e proporcionais + 1/3, 13º salário proporcional e FGTS com multa de 40%.`,
    reversao_justa_causa: `A justa causa aplicada é nula e desproporcional. Requer-se, principal ou sucessivamente, sua reversão para dispensa sem justa causa, com o pagamento integral das verbas rescisórias e a liberação das guias de FGTS e seguro-desemprego.`,
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
    return { id, title: definition.title, content: contentMap[id] };
  });
}

export function RTComposerPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get("processoId");
  const isEditing = Boolean(processoId);
  const [values, setValues] = useState<ComposerState>(() => {
    if (new URLSearchParams(window.location.search).get("processoId")) {
      return initialState;
    }
    try {
      const raw = window.localStorage.getItem(RT_DRAFT_STORAGE_KEY);
      return raw ? { ...initialState, ...(JSON.parse(raw) as Partial<ComposerState>) } : initialState;
    } catch {
      return initialState;
    }
  });
  const [people, setPeople] = useState<PessoaResponse[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<BlockId[]>(() => {
    try {
      const raw = window.localStorage.getItem(`${RT_DRAFT_STORAGE_KEY}:blocks`);
      return raw ? (JSON.parse(raw) as BlockId[]) : defaultBlocks;
    } catch {
      return defaultBlocks;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingDocx, setExportingDocx] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(`${RT_DRAFT_STORAGE_KEY}:savedAt`);
    } catch {
      return null;
    }
  });
  const [savedMessage, setSavedMessage] = useState("");
  const [existingProcesso, setExistingProcesso] = useState<Processo | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!session) return;
      setLoading(true);
      setError("");
      try {
        const [pessoas, usuarios, processo] = await Promise.all([
          api.getPessoas(session.token, 0, 300),
          api.getUsuarios(session.token, 0, 200),
          processoId
            ? api.getProcessoById(session.token, Number(processoId))
            : Promise.resolve(null)
        ]);

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
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar dados da RT.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [processoId, session]);

  useEffect(() => {
    if (processoId) return;
    try {
      window.localStorage.setItem(RT_DRAFT_STORAGE_KEY, JSON.stringify(values));
      window.localStorage.setItem(`${RT_DRAFT_STORAGE_KEY}:blocks`, JSON.stringify(selectedBlocks));
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(`${RT_DRAFT_STORAGE_KEY}:savedAt`, savedAt);
      setDraftSavedAt(savedAt);
    } catch {}
  }, [selectedBlocks, values, processoId]);

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
      () => users.filter((item) => item.perfil === "ADVOGADO" || item.perfil === "ADMIN"),
      [users]
  );

  const selectedClaimant = people.find((item) => item.id === Number(values.claimantId));
  const selectedDefendants = people.filter((item) => values.defendantIds.includes(String(item.id)));
  const selectedLawyer = lawyerOptions.find((item) => item.id === Number(values.advogadoId));

  const previewBlocks = useMemo(
      () => buildPreviewBlocks(selectedClaimant, selectedDefendants, selectedLawyer, values, selectedBlocks),
      [selectedClaimant, selectedDefendants, selectedLawyer, values, selectedBlocks]
  );

  function handleChange(field: keyof ComposerState, value: string | string[]) {
    setValues((current) => ({ ...current, [field]: value as never }));
  }

  function chooseClaimant(personId: number) {
    setValues((current) => ({ ...current, claimantId: String(personId), claimantSearch: "" }));
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

  function clearDraft() {
    setValues(initialState);
    setSelectedBlocks(defaultBlocks);
    setDraftSavedAt(null);
    try {
      window.localStorage.removeItem(RT_DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(`${RT_DRAFT_STORAGE_KEY}:blocks`);
      window.localStorage.removeItem(`${RT_DRAFT_STORAGE_KEY}:savedAt`);
    } catch {
      // Ignore local draft cleanup failures.
    }
  }

  function buildProcessoPayload(): ProcessoCreatePayload {
    const descricao = previewBlocks.map((block) => `${block.title}\n${block.content}`).join("\n\n");

    if (isEditing && existingProcesso) {
      return {
        numeroProcesso: existingProcesso.numeroProcesso,
        descricao,
        clienteId: Number(values.claimantId),
        advogadoId: Number(values.advogadoId),
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
        rtDescricaoAcidente: optional(values.descricaoAcidente),
        rtCctPeriodo: optional(values.cctPeriodo),
        rtClausulaConvencional: optional(values.clausulaConvencional),
        rtAssuntoClausula: optional(values.assuntoClausula),
        rtRedacaoClausula: optional(values.redacaoClausula),
        rtSalarioFuncaoOriginal: optional(values.salarioFuncaoOriginal),
        rtSalarioFuncaoAcumulada: optional(values.salarioFuncaoAcumulada),
        rtValorPagoPorFora: optional(values.valorPagoPorFora),
        rtMediaHorasExtras: optional(values.mediaHorasExtras)
      };
    }

    return {
      numeroProcesso: `RT-${Date.now()}`,
      descricao,
      clienteId: Number(values.claimantId),
      advogadoId: Number(values.advogadoId),
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
      rtDescricaoAcidente: optional(values.descricaoAcidente),
      rtCctPeriodo: optional(values.cctPeriodo),
      rtClausulaConvencional: optional(values.clausulaConvencional),
      rtAssuntoClausula: optional(values.assuntoClausula),
      rtRedacaoClausula: optional(values.redacaoClausula),
      rtSalarioFuncaoOriginal: optional(values.salarioFuncaoOriginal),
      rtSalarioFuncaoAcumulada: optional(values.salarioFuncaoAcumulada),
      rtValorPagoPorFora: optional(values.valorPagoPorFora),
      rtMediaHorasExtras: optional(values.mediaHorasExtras)
    };
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");
    setSavedMessage("");

    try {
      if (!session) throw new Error("Falha ao salvar RT.");

      const payload = buildProcessoPayload();

      if (isEditing && processoId) {
        await api.updateProcesso(session.token, Number(processoId), payload);
        setSavedMessage("RT atualizada com sucesso!");
      } else {
        await api.createProcesso(session.token, payload);
        setSavedMessage("RT salva com sucesso!");
      }

      window.setTimeout(() => {
        clearDraft();
        navigate("/rt");
      }, 3000);
    } catch (saveError) {
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
      await exportToDocx(previewBlocks, selectedClaimant?.nome ?? "reclamatoria", session.token);
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
              {draftSavedAt ? <span className="draft-indicator">Rascunho salvo no navegador</span> : null}
              {savedMessage ? <span className="draft-indicator">{savedMessage}</span> : null}
              <button
                  className="ghost-button ghost-button-light"
                  type="button"
                  onClick={() => {
                    if (!values.claimantId || !values.advogadoId || previewBlocks.length === 0) {
                      setShowValidation(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      return;
                    }
                    setShowValidation(false);
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
                Limpar rascunho
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

                      <label>
                        Advogado responsável
                        <select
                            value={values.advogadoId}
                            onChange={(event) => handleChange("advogadoId", event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {lawyerOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.pessoa.nome}
                              </option>
                          ))}
                        </select>
                        {showValidation && !values.advogadoId ? (
                          <span className="field-error">Selecione um advogado responsável</span>
                        ) : null}
                      </label>
                    </div>

                    <div className="entity-picker">
                      <div className="entity-results">
                        {claimantOptions.slice(0, 8).map((item) => (
                            <button
                                className={`entity-card ${values.claimantId === String(item.id) ? "selected" : ""}`}
                                key={item.id}
                                type="button"
                                onClick={() => chooseClaimant(item.id)}
                            >
                              <strong>{item.nome}</strong>
                              <span>{item.cpf || "CPF não informado"}</span>
                              <span>{item.email}</span>
                            </button>
                        ))}
                      </div>
                    </div>
                    {showValidation && !values.claimantId ? (
                      <span className="field-error">Selecione um reclamante</span>
                    ) : null}

                    {selectedClaimant ? (
                        <div className="selected-summary-card">
                          <strong>Reclamante selecionado</strong>
                          <p>{selectedClaimant.nome}</p>
                          <span>{formatAddress(selectedClaimant)}</span>
                        </div>
                    ) : null}

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

                {/* ── Dados variáveis ── */}
                <SectionCard
                    title="Dados variáveis do caso"
                    description="Esses campos alimentam os espaços variáveis dos textos do documento."
                >
                  <div className="party-form">
                    <div className="form-grid">
                      <label>
                        Função
                        <input value={values.funcao} onChange={(event) => handleChange("funcao", event.target.value)} />
                      </label>

                      <label>
                        Data de admissão
                        <input type="date" value={values.dataAdmissao} onChange={(event) => handleChange("dataAdmissao", event.target.value)} />
                      </label>

                      <label>
                        Data de demissão
                        <input type="date" value={values.dataDemissao} onChange={(event) => handleChange("dataDemissao", event.target.value)} />
                      </label>

                      <label>
                        Última remuneração
                        <input value={values.salario} onChange={(event) => handleChange("salario", event.target.value)} />
                      </label>

                      <label>
                        Cidade/local da prestação
                        <input value={values.cidadePrestacao} onChange={(event) => handleChange("cidadePrestacao", event.target.value)} />
                      </label>

                      <label>
                        Modalidade de rescisão
                        <select value={values.tipoRescisao} onChange={(event) => handleChange("tipoRescisao", event.target.value)}>
                          <option value="">Selecione</option>
                          <option value="SEM_JUSTA_CAUSA">Dispensa sem justa causa</option>
                          <option value="COM_JUSTA_CAUSA">Dispensa com justa causa</option>
                          <option value="PEDIDO_DEMISSAO">Pedido de demissão</option>
                          <option value="RESCISAO_INDIRETA">Rescisão indireta</option>
                          <option value="ACORDO">Acordo</option>
                          <option value="NAO_APLICAVEL">Não aplicável</option>
                        </select>
                      </label>

                      <label>
                        Descrição do acidente
                        <textarea rows={4} value={values.descricaoAcidente} onChange={(event) => handleChange("descricaoAcidente", event.target.value)} />
                      </label>

                      <label>
                        Período da CCT
                        <input value={values.cctPeriodo} onChange={(event) => handleChange("cctPeriodo", event.target.value)} />
                      </label>

                      <label>
                        Cláusula convencional
                        <input value={values.clausulaConvencional} onChange={(event) => handleChange("clausulaConvencional", event.target.value)} />
                      </label>

                      <label>
                        Assunto da cláusula
                        <input value={values.assuntoClausula} onChange={(event) => handleChange("assuntoClausula", event.target.value)} />
                      </label>

                      <label>
                        Redação da cláusula
                        <textarea rows={4} value={values.redacaoClausula} onChange={(event) => handleChange("redacaoClausula", event.target.value)} />
                      </label>

                      <label>
                        Salário da função original
                        <input value={values.salarioFuncaoOriginal} onChange={(event) => handleChange("salarioFuncaoOriginal", event.target.value)} />
                      </label>

                      <label>
                        Salário/acréscimo da função acumulada
                        <input value={values.salarioFuncaoAcumulada} onChange={(event) => handleChange("salarioFuncaoAcumulada", event.target.value)} />
                      </label>

                      <label>
                        Valor pago por fora
                        <input value={values.valorPagoPorFora} onChange={(event) => handleChange("valorPagoPorFora", event.target.value)} />
                      </label>

                      <label>
                        Média de horas extras
                        <input value={values.mediaHorasExtras} onChange={(event) => handleChange("mediaHorasExtras", event.target.value)} />
                      </label>
                    </div>
                  </div>
                </SectionCard>

                {/* ── Blocos do documento ── */}
                <SectionCard
                    title="Blocos do documento"
                    description="Selecione os blocos que compõem esta RT, organizados por seção."
                >
                  {showValidation && previewBlocks.length === 0 ? (
                    <span className="field-error">Selecione ao menos um bloco</span>
                  ) : null}
                  <div className="text-block-grid wide">
                    {Object.entries(blocksBySection).map(([section, blocks]) => (
                        <div className="block-section-group" key={section}>
                          <div className="block-section-title">{section}</div>
                          {blocks.map((block) => (
                              <label className="checkbox-card stacked" key={block.id}>
                                <input
                                    type="checkbox"
                                    checked={selectedBlocks.includes(block.id)}
                                    onChange={() => toggleBlock(block.id)}
                                />
                                <div>
                                  <strong>{block.title}</strong>
                                </div>
                              </label>
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
                        <p>{block.content}</p>
                      </section>
                  ))}
                </article>
              </SectionCard>
            </div>
        ) : null}
      </AppShell>
  );
}
