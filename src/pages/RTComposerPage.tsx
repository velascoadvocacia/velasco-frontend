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
  RtPreviewInlineImage,
  RtPreviewRequest,
  TipoRescisao,
  Usuario
} from "../types/api";

type BlockId =
    | "qualificacao_reclamante"
    | "dados_reclamante"
    | "qualificacao_reclamada"
    | "contrato_aspectos_gerais"
    | "reconhecimento_vinculo_empregaticio"
    | "periodo_sem_registro_ctps"
    | "dano_moral_ausencia_anotacao_ctps"
    | "retencao_ctps_dano_moral"
    | "diferencas_salariais_piso_convencional"
    | "ausencia_pagamento_verbas_rescisorias"
    | "verbas_rescisorias_aviso_previo"
    | "verbas_rescisorias_ferias"
    | "verbas_rescisorias_decimo_terceiro"
    | "verbas_rescisorias_multa_fgts"
    | "verbas_rescisorias_multas_467_477"
    | "dano_moral_ausencia_pagamento_verbas_rescisorias"
    | "pedido_rescisao_indireta"
    | "conversao_pedido_demissao_rescisao_indireta"
    | "reversao_justa_causa_rescisao_indireta"
    | "reversao_justa_causa_dispensa_sem_justa_causa"
    | "multa_art_477_clt"
    | "dispensa_discriminatoria_reintegracao_ou_pagamento"
    | "dispensa_discriminatoria_danos_morais"
    | "desvio_funcao_atividade_efetivamente_exercida"
    | "diferencas_salariais_acumulo_funcoes"
    | "diferencas_salariais_motorista_carreteiro_carregador"
    | "salario_a_latere"
    | "integracao_aluguel_veiculo_particular_natureza_salarial"
    | "dano_moral_atraso_salarial"
    | "verbas_rescisorias_media_horas_extras_nao_paga"
    | "jornada_trabalho"
    | "jornada_trabalho_horas_extras"
    | "jornada_trabalho_nulidade_banco_horas"
    | "jornada_trabalho_nulidade_acordo_compensacao_semana_inglesa"
    | "jornada_trabalho_turnos_ininterruptos_revezamento"
    | "jornada_trabalho_dias_descanso"
    | "jornada_trabalho_adicional_noturno"
    | "jornada_trabalho_sobreaviso"
    | "jornada_trabalho_intervalo_interjornada"
    | "jornada_trabalho_inconstitucionalidade_intervalo_intrajornada"
    | "jornada_trabalho_intervalo_intrajornada"
    | "jornada_trabalho_inconstitucionalidade_tempo_espera"
    | "jornada_trabalho_dano_moral_jornada_extenuante"
    | "jornada_trabalho_inconstitucionalidade_jornada_habitual_12h"
    | "meio_ambiente_trabalho_nocivo_saude"
    | "ausencia_depositos_fgts"
    | "diarias_viagem"
    | "baixa_ctps_tutela"
    | "rescisao_indireta_tutela_antecipada_verbas_incontroversas"
    | "tutela_urgencia_natureza_cautelar"
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

interface BlockRelationship {
  children: readonly BlockId[];
}

const blockRelationships: Partial<Record<BlockId, BlockRelationship>> = {
  jornada_trabalho: {
    children: [
      "jornada_trabalho_horas_extras",
      "jornada_trabalho_nulidade_banco_horas",
      "jornada_trabalho_nulidade_acordo_compensacao_semana_inglesa",
      "jornada_trabalho_turnos_ininterruptos_revezamento",
      "jornada_trabalho_dias_descanso",
      "jornada_trabalho_adicional_noturno",
      "jornada_trabalho_sobreaviso",
      "jornada_trabalho_intervalo_interjornada",
      "jornada_trabalho_inconstitucionalidade_intervalo_intrajornada",
      "jornada_trabalho_intervalo_intrajornada",
      "jornada_trabalho_inconstitucionalidade_tempo_espera",
      "jornada_trabalho_dano_moral_jornada_extenuante",
      "jornada_trabalho_inconstitucionalidade_jornada_habitual_12h"
    ]
  }
};

const parentByChild = Object.fromEntries(
    Object.entries(blockRelationships).flatMap(([parentId, relationship]) =>
        (relationship?.children || []).map((childId) => [childId, parentId as BlockId])
    )
) as Partial<Record<BlockId, BlockId>>;

const BLOCKS_FROM_API: BlockId[] = [
  "qualificacao_reclamante",
  "dados_reclamante",
  "qualificacao_reclamada",
  "contrato_aspectos_gerais",
  "baixa_ctps_tutela",
  "rescisao_indireta_tutela_antecipada_verbas_incontroversas",
  "tutela_urgencia_natureza_cautelar",
  "responsabilidade_solidaria_grupo_economico",
  "responsabilidade_subsidiaria",
  "responsabilidade_subsidiaria_contrato_administrativo",
  "legitimidade_passiva_socios",
  "reconhecimento_vinculo_empregaticio",
  "periodo_sem_registro_ctps",
  "dano_moral_ausencia_anotacao_ctps",
  "retencao_ctps_dano_moral",
  "diferencas_salariais_piso_convencional",
  "ausencia_pagamento_verbas_rescisorias",
  "dano_moral_ausencia_pagamento_verbas_rescisorias",
  "pedido_rescisao_indireta",
  "conversao_pedido_demissao_rescisao_indireta",
  "reversao_justa_causa_rescisao_indireta",
  "reversao_justa_causa_dispensa_sem_justa_causa",
  "multa_art_477_clt",
  "dispensa_discriminatoria_reintegracao_ou_pagamento",
  "dispensa_discriminatoria_danos_morais",
  "desvio_funcao_atividade_efetivamente_exercida",
  "diferencas_salariais_acumulo_funcoes",
  "diferencas_salariais_motorista_carreteiro_carregador",
  "salario_a_latere",
  "integracao_aluguel_veiculo_particular_natureza_salarial",
  "dano_moral_atraso_salarial",
  "adicional_transferencia",
  "verbas_rescisorias_media_horas_extras_nao_paga",
  "jornada_trabalho",
  "jornada_trabalho_horas_extras",
  "jornada_trabalho_nulidade_banco_horas",
  "jornada_trabalho_nulidade_acordo_compensacao_semana_inglesa",
  "jornada_trabalho_turnos_ininterruptos_revezamento",
  "jornada_trabalho_dias_descanso",
  "jornada_trabalho_adicional_noturno",
  "jornada_trabalho_sobreaviso",
  "jornada_trabalho_intervalo_interjornada",
  "jornada_trabalho_inconstitucionalidade_intervalo_intrajornada",
  "jornada_trabalho_intervalo_intrajornada",
  "jornada_trabalho_inconstitucionalidade_tempo_espera",
  "jornada_trabalho_dano_moral_jornada_extenuante",
  "jornada_trabalho_inconstitucionalidade_jornada_habitual_12h",
  "meio_ambiente_trabalho_nocivo_saude",
  "ausencia_depositos_fgts",
  "diarias_viagem"
];

const severanceChildBlockIds: BlockId[] = [
  "verbas_rescisorias_aviso_previo",
  "verbas_rescisorias_ferias",
  "verbas_rescisorias_decimo_terceiro",
  "verbas_rescisorias_multa_fgts",
  "verbas_rescisorias_multas_467_477"
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
  funcaoEfetivamenteExercida: string;
  dataInicioAcumuloFuncao: string;
  funcaoAdicional: string;
  formaRecebimento: string;
  valorMedioMensal: string;
  valorAluguelVeiculo: string;
  descricaoProvaAluguelVeiculo: string;
  localidadeTransferencia: string;
  dataInicioTransferencia: string;
  dataFimTransferencia: string;
  descricaoJornadaMedia: string;
  descricaoAusenciaControleJornada: string;
  descricaoNulidadeBancoHoras: string;
  horarioTrabalhoNoturno: string;
  descricaoChamadosSobreaviso: string;
  descricaoSupressaoIntervaloInterjornada: string;
  horasDiariasIntervaloIntrajornada: string;
  mediaHorasJornadaDiaria: string;
  descricaoAmbienteTrabalhoNocivo: string;
  clausulaCctDiariasViagem: string;
  identificacaoCctDiariasViagem: string;
  textoClausulaDiariasViagem: string;
  mediaViagensMensais: string;
  criterioProvaDiariasViagem: "" | "CONTROLES_JORNADA" | "PRESTACOES_CONTAS";
  remuneracao: string;
  motivoExtincao: "" | (typeof contractExtinctionOptions)[number]["value"];
  dataExtincao: string;
  informacoesComplementares: string;
  informacoesComplementaresCtps: string;
  informacoesComplementaresContratoAdministrativo: string;
  descricaoAtividadePrincipal: string;
  objetoContratoAdministrativo: string;
  clausulaNumeroContrato: string;
  fornecimentoPrestadora: string;
  motivoNaoEventualidade: string;
  motivoOnerosidade: string;
  motivoSubordinacao: string;
  dataInicioVinculo: string;
  dataFimVinculo: string;
  dataAnotacaoCtps: string;
  dataInicioPrestacaoServicos: string;
  descricaoDanoMoralCtps: string;
  dataAssinaturaCarteira: string;
  cctReferencia: string;
  qtdDiasAviso: string;
  detalheFerias: string;
  detalheDecimoTerceiro: string;
  justificativaRescisaoIndireta: string;
  descricaoFaltaGrave: string;
  motivoJustaCausa: string;
  condicaoDiscriminacao: string;
  comoFicouProvado: string;
  incluirJurisprudenciaDoenca: boolean;
  opcaoDesfecho: "" | "reintegracao" | "pagamento_dobro";
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
  imagensFixas: RtPreviewInlineImage[];
  paragrafosRecuados: number[];
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
        dataUpload: "",
        grupo: "geral",
        ordem: index,
        afterParagraph: 1
      }];
    }
    if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
      return [item as ProcessoAnexoResponse];
    }
    return [];
  });
}

function apiAssetUrl(url: string) {
  return new URL(url, `${API_BASE_URL}/`).toString();
}

function FixedPreviewImage({ image, token }: { image: RtPreviewInlineImage; token: string }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    let objectUrl = "";
    const controller = new AbortController();

    void fetch(apiAssetUrl(image.url), {
      headers: { "Authorization": `Bearer ${token}` },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar imagem fixa do preview.");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSource("");
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.url, token]);

  return source ? <img src={source} alt={image.nomeOriginal} /> : null;
}

function parsePreviewTable(paragraph: string) {
  const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
  const parseCells = (line: string) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const separatorIndex = lines.findIndex((line) => {
    const cells = parseCells(line);
    return cells.length === 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  });
  if (separatorIndex < 1) return null;

  const headers = parseCells(lines[separatorIndex - 1]);
  if (headers.length !== 2) return null;

  const body: string[][] = [];
  let endIndex = separatorIndex + 1;
  while (endIndex < lines.length && lines[endIndex].includes("|")) {
    const row = parseCells(lines[endIndex]);
    if (row.length !== 2) break;
    if (row.some(Boolean)) body.push(row);
    endIndex += 1;
  }
  if (body.length === 0) return null;

  return {
    before: lines.slice(0, separatorIndex - 1).join("\n"),
    headers,
    body,
    after: lines.slice(endIndex).join("\n")
  };
}

function renderBlockContent(content: string, anexos: ProcessoAnexoResponse[], imagensFixas: RtPreviewInlineImage[], renderAttachments: boolean, token: string, blockId: BlockId, paragrafosRecuados: number[]) {
  const paragraphs = content.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  return paragraphs.map((paragraph, index) => {
    const table = blockId === "jornada_trabalho_inconstitucionalidade_intervalo_intrajornada"
      ? parsePreviewTable(paragraph)
      : null;
    return (
      <Fragment key={`${paragraph}-${index}`}>
      {table ? (
        <>
          {table.before ? <p>{renderInlineMarkdown(table.before)}</p> : null}
          <div className="rt-preview-table-wrapper">
            <table className="rt-preview-comparison-table">
              <thead>
                <tr>{table.headers.map((header) => <th key={header}>{renderInlineMarkdown(header)}</th>)}</tr>
              </thead>
              <tbody>
                {table.body.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => <td key={cellIndex}>{renderInlineMarkdown(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.after ? <p>{renderInlineMarkdown(table.after)}</p> : null}
        </>
      ) : (
        <p className={paragrafosRecuados.includes(index + 1) ? "rt-preview-jurisprudence-indented" : blockId === "diferencas_salariais_motorista_carreteiro_carregador" && /TRT\s*(?:da\s*)?(?:8ª|10ª|14ª)\s*Regi[aã]o/i.test(paragraph) ? "rt-preview-citation-right" : undefined}>
          {paragraph.split("\n").map((line, lineIndex) => (
            <Fragment key={`${line}-${lineIndex}`}>
              {lineIndex > 0 ? <br /> : null}
              {renderInlineMarkdown(line)}
            </Fragment>
          ))}
        </p>
      )}
      {renderAttachments && anexos.some((anexo) => (anexo.afterParagraph || 1) === index + 1) ? (
        <div className="rt-preview-attachments">
          {anexos.filter((anexo) => (anexo.afterParagraph || 1) === index + 1).map((anexo) => (
            <img key={anexo.id} src={anexo.url} alt={anexo.nomeOriginal} />
          ))}
        </div>
      ) : null}
      {imagensFixas.filter((imagem) => imagem.afterParagraph === index + 1).map((imagem) => (
        <div
            className={`rt-preview-attachments${["jornada_trabalho_dano_moral_jornada_extenuante", "jornada_trabalho_inconstitucionalidade_jornada_habitual_12h"].includes(blockId) ? " rt-preview-fixed-images-wide" : ""}`}
            key={`${imagem.url}-${imagem.afterParagraph}`}
        >
          <FixedPreviewImage image={imagem} token={token} />
        </div>
      ))}
      </Fragment>
    );
  });
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
  funcaoEfetivamenteExercida: "",
  dataInicioAcumuloFuncao: "",
  funcaoAdicional: "",
  formaRecebimento: "",
  valorMedioMensal: "",
  valorAluguelVeiculo: "",
  descricaoProvaAluguelVeiculo: "",
  localidadeTransferencia: "",
  dataInicioTransferencia: "",
  dataFimTransferencia: "",
  descricaoJornadaMedia: "",
  descricaoAusenciaControleJornada: "",
  descricaoNulidadeBancoHoras: "",
  horarioTrabalhoNoturno: "",
  descricaoChamadosSobreaviso: "",
  descricaoSupressaoIntervaloInterjornada: "",
  horasDiariasIntervaloIntrajornada: "",
  mediaHorasJornadaDiaria: "",
  descricaoAmbienteTrabalhoNocivo: "",
  clausulaCctDiariasViagem: "",
  identificacaoCctDiariasViagem: "",
  textoClausulaDiariasViagem: "",
  mediaViagensMensais: "",
  criterioProvaDiariasViagem: "",
  remuneracao: "",
  motivoExtincao: "",
  dataExtincao: "",
  informacoesComplementares: "",
  informacoesComplementaresCtps: "",
  informacoesComplementaresContratoAdministrativo: "",
  descricaoAtividadePrincipal: "",
  objetoContratoAdministrativo: "",
  clausulaNumeroContrato: "",
  fornecimentoPrestadora: "",
  motivoNaoEventualidade: "",
  motivoOnerosidade: "",
  motivoSubordinacao: "",
  dataInicioVinculo: "",
  dataFimVinculo: "",
  dataAnotacaoCtps: "",
  dataInicioPrestacaoServicos: "",
  descricaoDanoMoralCtps: "",
  dataAssinaturaCarteira: "",
  cctReferencia: "",
  qtdDiasAviso: "",
  detalheFerias: "",
  detalheDecimoTerceiro: "",
  justificativaRescisaoIndireta: "",
  descricaoFaltaGrave: "",
  motivoJustaCausa: "",
  condicaoDiscriminacao: "",
  comoFicouProvado: "",
  incluirJurisprudenciaDoenca: false,
  opcaoDesfecho: ""
};

const blockDefinitions: BlockDefinition[] = [
  { id: "qualificacao_reclamante", title: "Qualificação do reclamante", section: "Dados iniciais" },
  { id: "qualificacao_reclamada", title: "Qualificação da reclamada", section: "Dados iniciais" },
  { id: "dados_reclamante", title: "Dados do(a) reclamante", section: "Dados iniciais" },
  { id: "contrato_aspectos_gerais", title: "Contrato de trabalho - Aspectos gerais", section: "Contrato de trabalho" },
  { id: "baixa_ctps_tutela", title: "Baixa na CTPS física. Tutela antecipada", section: "Tutela antecipada" },
  { id: "rescisao_indireta_tutela_antecipada_verbas_incontroversas", title: "Rescisão indireta. Tutela antecipada. Verbas incontroversas (art. 294, parágrafo único, do CPC)", section: "Tutela antecipada" },
  { id: "tutela_urgencia_natureza_cautelar", title: "Tutela de urgência de natureza cautelar. (art. 300 do CPC)", section: "Tutela antecipada" },
  { id: "responsabilidade_solidaria_grupo_economico", title: "Responsabilidade solidária. Grupo econômico", section: "Responsabilidade" },
  { id: "legitimidade_passiva_socios", title: "Legitimidade passiva dos sócios das rés", section: "Responsabilidade" },
  { id: "responsabilidade_subsidiaria", title: "Responsabilidade subsidiária", section: "Responsabilidade" },
  { id: "responsabilidade_subsidiaria_contrato_administrativo", title: "Responsabilidade subsidiária. Contrato administrativo", section: "Responsabilidade" },
  { id: "reconhecimento_vinculo_empregaticio", title: "Reconhecimento de vínculo empregatício", section: "Vínculo empregatício" },
  { id: "periodo_sem_registro_ctps", title: "Período sem registro em CTPS. Reconhecimento de vínculo empregatício", section: "Vínculo empregatício" },
  { id: "dano_moral_ausencia_anotacao_ctps", title: "Dano moral por ausência de anotação da CTPS", section: "Vínculo empregatício" },
  { id: "retencao_ctps_dano_moral", title: "Retenção da CTPS. Dano moral", section: "Vínculo empregatício" },
  { id: "diferencas_salariais_piso_convencional", title: "Diferenças salariais. Piso convencional", section: "Diferenças salariais" },
  { id: "ausencia_pagamento_verbas_rescisorias", title: "Ausência de pagamento das verbas rescisórias", section: "Verbas rescisórias" },
  { id: "dano_moral_ausencia_pagamento_verbas_rescisorias", title: "Dano moral por ausência de pagamento das verbas rescisórias", section: "Verbas rescisórias" },
  { id: "pedido_rescisao_indireta", title: "Pedido de rescisão indireta", section: "Verbas rescisórias" },
  { id: "conversao_pedido_demissao_rescisao_indireta", title: "Conversão do pedido de demissão em rescisão indireta", section: "Verbas rescisórias" },
  { id: "reversao_justa_causa_rescisao_indireta", title: "Reversão da justa causa para rescisão indireta", section: "Verbas rescisórias" },
  { id: "reversao_justa_causa_dispensa_sem_justa_causa", title: "Reversão da justa causa para dispensa sem justa causa", section: "Verbas rescisórias" },
  { id: "multa_art_477_clt", title: "Multa do art. 477, § 8º, da CLT", section: "Verbas rescisórias" },
  { id: "dispensa_discriminatoria_reintegracao_ou_pagamento", title: "Dispensa discriminatória. Reintegração OU Pagamento do período de afastamento", section: "Verbas rescisórias" },
  { id: "dispensa_discriminatoria_danos_morais", title: "Dispensa discriminatória. Danos morais", section: "Verbas rescisórias" },
  { id: "desvio_funcao_atividade_efetivamente_exercida", title: "Desvio de função. Atividade efetivamente exercida pela parte autora", section: "Desvio de função" },
  { id: "diferencas_salariais_acumulo_funcoes", title: "Diferenças salariais. Exercício de função de _____ e de _____", section: "Diferenças salariais" },
  { id: "diferencas_salariais_motorista_carreteiro_carregador", title: "Diferenças salariais. Exercício de função de motorista carreteiro e de carregador de caminhão", section: "Diferenças salariais" },
  { id: "salario_a_latere", title: "Salário a latere", section: "Diferenças salariais" },
  { id: "integracao_aluguel_veiculo_particular_natureza_salarial", title: "Integração do aluguel do veículo particular. Natureza salarial", section: "Diferenças salariais" },
  { id: "dano_moral_atraso_salarial", title: "Dano moral por atraso salarial", section: "Diferenças salariais" },
  { id: "adicional_transferencia", title: "Adicional de transferência", section: "Diferenças salariais" },
  { id: "verbas_rescisorias_media_horas_extras_nao_paga", title: "Verbas rescisórias. Média de horas extras não paga", section: "Verbas rescisórias" },
  { id: "jornada_trabalho", title: "Jornada de trabalho", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_horas_extras", title: "a. Horas extras", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_nulidade_banco_horas", title: "b. Nulidade do banco de horas", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_nulidade_acordo_compensacao_semana_inglesa", title: "c. Nulidade do acordo de compensação de jornada (‘‘semana inglesa’’)", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_turnos_ininterruptos_revezamento", title: "a. Turnos ininterruptos de revezamento", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_dias_descanso", title: "e. Trabalho em dias de descanso", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_adicional_noturno", title: "f. Adicional noturno", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_sobreaviso", title: "g. Sobreaviso", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_intervalo_interjornada", title: "h. Intervalo interjornada", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_inconstitucionalidade_intervalo_intrajornada", title: "i. Inconstitucionalidade da alteração promovida no § 4º do art. 71 da CLT pela Lei n.º 13.467/2017 (natureza indenizatória do intervalo intrajornada)", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_intervalo_intrajornada", title: "j. Intervalo intrajornada (nulidade dos intervalos superiores a 2h e fracionados – Tempo à disposição)", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_inconstitucionalidade_tempo_espera", title: "k. Inconstitucionalidade do tempo de espera", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_dano_moral_jornada_extenuante", title: "l. Dano moral pelo cumprimento de jornada extenuante", section: "Jornada de trabalho" },
  { id: "jornada_trabalho_inconstitucionalidade_jornada_habitual_12h", title: "m. Inconstitucionalidade da jornada habitual de 12h diárias", section: "Jornada de trabalho" },
  { id: "meio_ambiente_trabalho_nocivo_saude", title: "Meio ambiente de trabalho nocivo à saúde", section: "Meio ambiente de trabalho" },
  { id: "ausencia_depositos_fgts", title: "Ausência de depósitos de FGTS", section: "FGTS" },
  { id: "diarias_viagem", title: "Diárias de viagem", section: "Diárias de viagem" },
];

const defaultBlocks: BlockId[] = [
  "qualificacao_reclamante",
  "qualificacao_reclamada",
  "dados_reclamante"
];

function orderSelectedBlocks(selectedBlocks: BlockId[]) {
  const ordered: BlockId[] = [];

  blockDefinitions.forEach((block) => {
    if (parentByChild[block.id]) return;
    if (selectedBlocks.includes(block.id)) ordered.push(block.id);

    (blockRelationships[block.id]?.children || []).forEach((childId) => {
      if (selectedBlocks.includes(block.id) && selectedBlocks.includes(childId)) ordered.push(childId);
    });
  });

  return ordered;
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
    "informacoesComplementaresContratoAdministrativo"
  ],
  reconhecimento_vinculo_empregaticio: [
    "motivoNaoEventualidade",
    "motivoOnerosidade",
    "motivoSubordinacao",
    "dataInicioVinculo",
    "dataFimVinculo"
  ],
  periodo_sem_registro_ctps: [
    "dataAnotacaoCtps",
    "dataInicioPrestacaoServicos"
  ],
  dano_moral_ausencia_anotacao_ctps: ["descricaoDanoMoralCtps"],
  retencao_ctps_dano_moral: ["dataAssinaturaCarteira"],
  diferencas_salariais_piso_convencional: ["cctReferencia"],
  verbas_rescisorias_aviso_previo: ["qtdDiasAviso"],
  verbas_rescisorias_ferias: ["detalheFerias"],
  verbas_rescisorias_decimo_terceiro: ["detalheDecimoTerceiro"],
  verbas_rescisorias_multa_fgts: [],
  verbas_rescisorias_multas_467_477: [],
  pedido_rescisao_indireta: ["justificativaRescisaoIndireta"],
  conversao_pedido_demissao_rescisao_indireta: ["descricaoFaltaGrave"],
  reversao_justa_causa_rescisao_indireta: ["motivoJustaCausa"],
  dispensa_discriminatoria_reintegracao_ou_pagamento: ["condicaoDiscriminacao", "comoFicouProvado", "incluirJurisprudenciaDoenca", "opcaoDesfecho"],
  desvio_funcao_atividade_efetivamente_exercida: [
    "funcaoContrato",
    "funcaoEfetivamenteExercida",
    "clausulaConvencional",
    "cctReferencia",
    "redacaoClausula"
  ],
  diferencas_salariais_acumulo_funcoes: [
    "funcaoContrato",
    "funcaoEfetivamenteExercida",
    "dataAdmissao",
    "dataInicioAcumuloFuncao",
    "salarioFuncaoOriginal",
    "salarioFuncaoAcumulada",
    "remuneracao"
  ],
  diferencas_salariais_motorista_carreteiro_carregador: ["funcaoAdicional"],
  salario_a_latere: ["formaRecebimento", "valorMedioMensal"],
  integracao_aluguel_veiculo_particular_natureza_salarial: ["valorAluguelVeiculo", "descricaoProvaAluguelVeiculo"],
  adicional_transferencia: ["dataContratacao", "localidadeTransferencia", "dataInicioTransferencia", "dataFimTransferencia"],
  jornada_trabalho: ["descricaoJornadaMedia", "descricaoAusenciaControleJornada"],
  jornada_trabalho_nulidade_banco_horas: ["descricaoNulidadeBancoHoras"],
  jornada_trabalho_adicional_noturno: ["horarioTrabalhoNoturno"],
  jornada_trabalho_sobreaviso: ["descricaoChamadosSobreaviso"],
  jornada_trabalho_intervalo_interjornada: ["descricaoSupressaoIntervaloInterjornada"],
  jornada_trabalho_intervalo_intrajornada: ["horasDiariasIntervaloIntrajornada"],
  jornada_trabalho_dano_moral_jornada_extenuante: ["mediaHorasJornadaDiaria"],
  meio_ambiente_trabalho_nocivo_saude: ["descricaoAmbienteTrabalhoNocivo"],
  diarias_viagem: ["clausulaCctDiariasViagem", "identificacaoCctDiariasViagem", "textoClausulaDiariasViagem", "mediaViagensMensais", "criterioProvaDiariasViagem"]
};

function blockTitle(block: BlockDefinition, values: ComposerState) {
  if (block.id === "diferencas_salariais_acumulo_funcoes") {
    return `Diferenças salariais. Exercício de função de ${optional(values.funcaoContrato) || "_____"} e de ${optional(values.funcaoEfetivamenteExercida) || "_____"}`;
  }
  if (block.id !== "contrato_aspectos_gerais") return block.title;
  return contractExtinctionOptions.find((option) => option.value === values.motivoExtincao)?.title || block.title;
}

function movePeriodTitleIntoContent(content: string, apiTitle?: string) {
  const period = apiTitle?.match(/\(de (.+) à (.+)\)$/);
  if (!period || !content.includes("Durante o intervalo sem registro,")) return content;
  return content.replace(
    "Durante o intervalo sem registro,",
    `Durante o intervalo sem registro (de ${period[1]} à ${period[2]}),`
  );
}

function buildVariablePayload(values: ComposerState, selectedBlocks: BlockId[]) {
  return Object.fromEntries(
    selectedBlocks.map((blockId) => [
      blockId,
      Object.fromEntries((variableFieldsByBlock[blockId] ?? []).map((key) => [key, optional(String(values[key] ?? ""))]))
    ])
  );
}

function buildApiVariablePayload(values: ComposerState, selectedBlocks: BlockId[], sitesEncerramentoAtividades: string[]) {
  const keys = new Set(selectedBlocks.flatMap((blockId) => (variableFieldsByBlock[blockId] ?? [])
    .filter((key) => !(blockId === "diarias_viagem" && key === "mediaViagensMensais" && values.criterioProvaDiariasViagem !== "CONTROLES_JORNADA"))));
  return {
    ...Object.fromEntries(Array.from(keys).map((key) => [key, optional(String(values[key] ?? ""))])),
    ...(selectedBlocks.includes("rescisao_indireta_tutela_antecipada_verbas_incontroversas")
      ? { sitesEncerramentoAtividades }
      : {}),
    ...(selectedBlocks.includes("dispensa_discriminatoria_reintegracao_ou_pagamento")
      ? { incluirJurisprudenciaDoenca: values.incluirJurisprudenciaDoenca }
      : {}),
    ...(selectedBlocks.includes("diferencas_salariais_acumulo_funcoes")
      ? {
          funcaoContratada: optional(values.funcaoContrato),
          funcaoAcumulada: optional(values.funcaoEfetivamenteExercida),
          dataAdmissao: optional(values.dataAdmissao),
          dataInicioAcumuloFuncao: optional(values.dataInicioAcumuloFuncao),
          salarioFuncaoContratada: optional(values.salarioFuncaoOriginal),
          salarioFuncaoAcumulada: optional(values.salarioFuncaoAcumulada),
          salarioAtualAutora: optional(values.remuneracao)
        }
      : {})
  };
}

function selectedVariableValue(values: ComposerState, selectedBlocks: BlockId[], field: keyof ComposerState) {
  const selectedFields = new Set(selectedBlocks.flatMap((blockId) => variableFieldsByBlock[blockId] ?? []));
  return selectedFields.has(field) ? optional(String(values[field] ?? "")) : null;
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
    funcaoContrato: contrato?.funcaoExercida ?? "",
    funcaoEfetivamenteExercida: String(processo.dadosVariaveis?.desvio_funcao_atividade_efetivamente_exercida?.funcaoEfetivamenteExercida ?? ""),
    dataInicioAcumuloFuncao: String(processo.dadosVariaveis?.diferencas_salariais_acumulo_funcoes?.dataInicioAcumuloFuncao ?? ""),
    funcaoAdicional: String(processo.dadosVariaveis?.diferencas_salariais_motorista_carreteiro_carregador?.funcaoAdicional ?? ""),
    formaRecebimento: String(processo.dadosVariaveis?.salario_a_latere?.formaRecebimento ?? ""),
    valorMedioMensal: String(processo.dadosVariaveis?.salario_a_latere?.valorMedioMensal ?? ""),
    valorAluguelVeiculo: String(processo.dadosVariaveis?.integracao_aluguel_veiculo_particular_natureza_salarial?.valorAluguelVeiculo ?? ""),
    descricaoProvaAluguelVeiculo: String(processo.dadosVariaveis?.integracao_aluguel_veiculo_particular_natureza_salarial?.descricaoProvaAluguelVeiculo ?? ""),
    localidadeTransferencia: String(processo.dadosVariaveis?.adicional_transferencia?.localidadeTransferencia ?? ""),
    dataInicioTransferencia: String(processo.dadosVariaveis?.adicional_transferencia?.dataInicioTransferencia ?? ""),
    dataFimTransferencia: String(processo.dadosVariaveis?.adicional_transferencia?.dataFimTransferencia ?? ""),
    descricaoJornadaMedia: String(processo.dadosVariaveis?.jornada_trabalho?.descricaoJornadaMedia ?? ""),
    descricaoAusenciaControleJornada: String(processo.dadosVariaveis?.jornada_trabalho?.descricaoAusenciaControleJornada ?? ""),
    descricaoNulidadeBancoHoras: String(processo.dadosVariaveis?.jornada_trabalho_nulidade_banco_horas?.descricaoNulidadeBancoHoras ?? ""),
    horarioTrabalhoNoturno: String(processo.dadosVariaveis?.jornada_trabalho_adicional_noturno?.horarioTrabalhoNoturno ?? ""),
    descricaoChamadosSobreaviso: String(processo.dadosVariaveis?.jornada_trabalho_sobreaviso?.descricaoChamadosSobreaviso ?? ""),
    descricaoSupressaoIntervaloInterjornada: String(processo.dadosVariaveis?.jornada_trabalho_intervalo_interjornada?.descricaoSupressaoIntervaloInterjornada ?? ""),
    horasDiariasIntervaloIntrajornada: String(processo.dadosVariaveis?.jornada_trabalho_intervalo_intrajornada?.horasDiariasIntervaloIntrajornada ?? ""),
    mediaHorasJornadaDiaria: String(processo.dadosVariaveis?.jornada_trabalho_dano_moral_jornada_extenuante?.mediaHorasJornadaDiaria ?? ""),
    descricaoAmbienteTrabalhoNocivo: String(processo.dadosVariaveis?.meio_ambiente_trabalho_nocivo_saude?.descricaoAmbienteTrabalhoNocivo ?? ""),
    clausulaCctDiariasViagem: String(processo.dadosVariaveis?.diarias_viagem?.clausulaCctDiariasViagem ?? ""),
    identificacaoCctDiariasViagem: String(processo.dadosVariaveis?.diarias_viagem?.identificacaoCctDiariasViagem ?? ""),
    textoClausulaDiariasViagem: String(processo.dadosVariaveis?.diarias_viagem?.textoClausulaDiariasViagem ?? ""),
    mediaViagensMensais: String(processo.dadosVariaveis?.diarias_viagem?.mediaViagensMensais ?? ""),
    criterioProvaDiariasViagem: (["CONTROLES_JORNADA", "PRESTACOES_CONTAS"] as const).includes(processo.dadosVariaveis?.diarias_viagem?.criterioProvaDiariasViagem as "CONTROLES_JORNADA" | "PRESTACOES_CONTAS")
      ? processo.dadosVariaveis?.diarias_viagem?.criterioProvaDiariasViagem as ComposerState["criterioProvaDiariasViagem"]
      : "",
    dataContratacao: contrato?.dataAdmissao ?? String(processo.dadosVariaveis?.adicional_transferencia?.dataContratacao ?? ""),
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

type ExportImageFile = { file: File; grupo: "geral" | "cbo" | "provas" | "provasExtratoFgts" };

async function getExportImageFiles(blocks: PreviewBlock[], pendingFilesByBlock: Partial<Record<BlockId, ExportImageFile[]>>) {
  const filesByBlock: Partial<Record<BlockId, ExportImageFile[]>> = {};
  for (const block of blocks) {
    if (!block.anexos.length && !pendingFilesByBlock[block.id]?.length) continue;
    filesByBlock[block.id] = [...(pendingFilesByBlock[block.id] || [])];
    for (const anexo of block.anexos) {
      if (anexo.id < 0) continue;
      const response = await fetch(anexo.url);
      if (!response.ok) throw new Error(`Não foi possível baixar o anexo ${anexo.nomeOriginal} para exportação.`);
      const blob = await response.blob();
      filesByBlock[block.id]!.push({
        file: new File([blob], anexo.nomeOriginal, { type: anexo.contentType || blob.type }),
        grupo: anexo.grupo || "geral"
      });
    }
  }
  return filesByBlock;
}

export async function exportToDocx(
    previewBlocks: PreviewBlock[],
    claimantName: string,
    token: string,
    imageFilesByBlock: Partial<Record<BlockId, ExportImageFile[]>>,
    requestData: RtPreviewRequest
) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify({
    claimantName,
    ...requestData,
    blocks: previewBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      content: block.content,
      anexos: block.anexos.map((anexo) => ({
        url: anexo.url,
        contentType: anexo.contentType,
        nomeOriginal: anexo.nomeOriginal,
        grupo: anexo.grupo,
        afterParagraph: anexo.afterParagraph
      }))
    }))
  }));
  Object.entries(imageFilesByBlock).forEach(([blockId, files]) => {
    files?.forEach(({ file, grupo }, index) => {
      const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      const groupSuffix = grupo === "geral" ? "" : `_${grupo}`;
      formData.append("arquivos", file, `anexo_${blockId}${groupSuffix}_${index}${extension}`);
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
    apiPreviewAttachments: Partial<Record<BlockId, ProcessoAnexoResponse[]>>,
    apiPreviewFixedImages: Partial<Record<BlockId, RtPreviewInlineImage[]>>,
    apiPreviewIndentedParagraphs: Partial<Record<BlockId, number[]>>
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
    const apiContent = BLOCKS_FROM_API.includes(id) ? apiPreviewTexts[id] || "" : contentMap[id] || "";
    return {
      id,
      title: id === "contrato_aspectos_gerais"
        ? apiPreviewTitles[id] || blockTitle(definition, values)
        : blockTitle(definition, values),
      content: id === "periodo_sem_registro_ctps"
        ? movePeriodTitleIntoContent(apiContent, apiPreviewTitles[id])
        : apiContent,
      anexos: apiPreviewAttachments[id] || [],
      imagensFixas: apiPreviewFixedImages[id] || [],
      paragrafosRecuados: apiPreviewIndentedParagraphs[id] || []
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
  const [selectedSeveranceChildren, setSelectedSeveranceChildren] = useState<BlockId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingProcuracao, setExportingProcuracao] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [pendingCtpsFiles, setPendingCtpsFiles] = useState<File[]>([]);
  const [pendingResponsabilidadeFiles, setPendingResponsabilidadeFiles] = useState<File[]>([]);
  const [pendingContratoAdministrativoFiles, setPendingContratoAdministrativoFiles] = useState<File[]>([]);
  const [pendingDiferencasSalariaisFiles, setPendingDiferencasSalariaisFiles] = useState<File[]>([]);
  const [pendingDispensaDiscriminatoriaFiles, setPendingDispensaDiscriminatoriaFiles] = useState<File[]>([]);
  const [pendingDesvioCboFiles, setPendingDesvioCboFiles] = useState<File[]>([]);
  const [pendingDesvioProvasFiles, setPendingDesvioProvasFiles] = useState<File[]>([]);
  const [pendingIntegracaoAluguelFiles, setPendingIntegracaoAluguelFiles] = useState<File[]>([]);
  const [pendingDanoMoralAtrasoFiles, setPendingDanoMoralAtrasoFiles] = useState<File[]>([]);
  const [pendingTrctMediaHorasFiles, setPendingTrctMediaHorasFiles] = useState<File[]>([]);
  const [pendingExtratoFgtsFiles, setPendingExtratoFgtsFiles] = useState<File[]>([]);
  const [siteEncerramentoInput, setSiteEncerramentoInput] = useState("");
  const [sitesEncerramentoAtividades, setSitesEncerramentoAtividades] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState("");
  const [existingProcesso, setExistingProcesso] = useState<Processo | null>(null);
  const [apiPreviews, setApiPreviews] = useState<Partial<Record<BlockId, {
    text: string;
    title: string;
    anexos: ProcessoAnexoResponse[];
    imagensFixas: RtPreviewInlineImage[];
    paragrafosRecuados: number[];
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
  const pendingDiferencasSalariaisPreviews = useMemo(
      () => pendingDiferencasSalariaisFiles.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file)
      })),
      [pendingDiferencasSalariaisFiles]
  );
  const pendingDispensaDiscriminatoriaPreviews = useMemo(
      () => pendingDispensaDiscriminatoriaFiles.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file)
      })),
      [pendingDispensaDiscriminatoriaFiles]
  );
  const pendingDesvioCboPreviews = useMemo(
      () => pendingDesvioCboFiles.map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file) })),
      [pendingDesvioCboFiles]
  );
  const pendingDesvioProvasPreviews = useMemo(
      () => pendingDesvioProvasFiles.map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file) })),
      [pendingDesvioProvasFiles]
  );
  const pendingIntegracaoAluguelPreviews = useMemo(
      () => pendingIntegracaoAluguelFiles.map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file) })),
      [pendingIntegracaoAluguelFiles]
  );
  const pendingDanoMoralAtrasoPreviews = useMemo(
      () => pendingDanoMoralAtrasoFiles.map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file) })),
      [pendingDanoMoralAtrasoFiles]
  );
  const pendingTrctMediaHorasPreviews = useMemo(
      () => pendingTrctMediaHorasFiles.map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file) })),
      [pendingTrctMediaHorasFiles]
  );
  const pendingExtratoFgtsPreviews = useMemo(
      () => pendingExtratoFgtsFiles.map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file) })),
      [pendingExtratoFgtsFiles]
  );

  useEffect(() => () => {
    pendingCtpsPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingResponsabilidadePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingContratoAdministrativoPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingDiferencasSalariaisPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingDispensaDiscriminatoriaPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingDesvioCboPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingDesvioProvasPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingIntegracaoAluguelPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingDanoMoralAtrasoPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingTrctMediaHorasPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    pendingExtratoFgtsPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [pendingCtpsPreviews, pendingResponsabilidadePreviews, pendingContratoAdministrativoPreviews, pendingDiferencasSalariaisPreviews, pendingDispensaDiscriminatoriaPreviews, pendingDesvioCboPreviews, pendingDesvioProvasPreviews, pendingIntegracaoAluguelPreviews, pendingDanoMoralAtrasoPreviews, pendingTrctMediaHorasPreviews, pendingExtratoFgtsPreviews]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!session) return;
      setLoading(true);
      setError("");

      if (!processoId) {
        setValues(initialState);
        setSelectedBlocks(defaultBlocks);
        setSelectedSeveranceChildren([]);
        setExistingProcesso(null);
        setApiPreviews({});
        setPendingCtpsFiles([]);
        setPendingResponsabilidadeFiles([]);
        setPendingContratoAdministrativoFiles([]);
        setPendingDiferencasSalariaisFiles([]);
        setPendingDispensaDiscriminatoriaFiles([]);
        setPendingDesvioCboFiles([]);
        setPendingDesvioProvasFiles([]);
        setPendingIntegracaoAluguelFiles([]);
        setPendingDanoMoralAtrasoFiles([]);
        setPendingTrctMediaHorasFiles([]);
        setPendingExtratoFgtsFiles([]);
        setSiteEncerramentoInput("");
        setSitesEncerramentoAtividades([]);
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
  const apiBlocksForRequest = selectedApiBlocks.flatMap((blockId) =>
      blockId === "ausencia_pagamento_verbas_rescisorias"
          ? [blockId, ...selectedSeveranceChildren]
          : [blockId]
  );
  const apiPreviewDependencies = [
    selectedApiBlocks.join(","),
    selectedSeveranceChildren.join(","),
    ...values.claimantIds,
    ...values.defendantIds,
    ...values.advogadoIds,
    ...sitesEncerramentoAtividades,
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
          imagensFixas: [],
          paragrafosRecuados: [],
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
        imagensFixas: current[id]?.imagensFixas || [],
        paragrafosRecuados: current[id]?.paragrafosRecuados || [],
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
        dadosVariaveis: buildApiVariablePayload(values, apiBlocksForRequest, sitesEncerramentoAtividades)
      };

      void api.previewRT(session.token, payload)
        .then((response) => {
          setApiPreviews((current) => ({
            ...current,
            ...Object.fromEntries(selectedApiBlocks.map((id) => {
              const block = response.blocos.find((item) => item.id === id);
              return [id, {
                text: block?.texto || "Texto de qualificação não retornado pelo backend.",
                title: block?.titulo || "",
                anexos: normalizePreviewAttachments(block?.anexos),
                imagensFixas: block?.imagensFixas || [],
                paragrafosRecuados: block?.paragrafosRecuados || [],
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
            ...Object.fromEntries(selectedApiBlocks.map((id) => [id, {
              text: "",
              title: "",
              anexos: current[id]?.anexos || [],
              imagensFixas: current[id]?.imagensFixas || [],
              paragrafosRecuados: current[id]?.paragrafosRecuados || [],
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
    attachments[id] = [
      ...(apiPreviews[id]?.anexos || []),
      ...(id === "ausencia_depositos_fgts" ? pendingExtratoFgtsPreviews.map(({ file, url }, index) => ({
        id: -(index + 1),
        processoId: processoId ? Number(processoId) : 0,
        blocoId: "ausencia_depositos_fgts",
        grupo: "provasExtratoFgts" as const,
        ordem: (apiPreviews[id]?.anexos.length || 0) + index,
        afterParagraph: 1,
        nomeOriginal: file.name,
        contentType: file.type,
        tamanhoBytes: file.size,
        url,
        dataUpload: ""
      })) : [])
    ];
    return attachments;
  }, {});

  const apiPreviewFixedImages = selectedApiBlocks.reduce<Partial<Record<BlockId, RtPreviewInlineImage[]>>>((images, id) => {
    images[id] = apiPreviews[id]?.imagensFixas || [];
    return images;
  }, {});

  const apiPreviewIndentedParagraphs = selectedApiBlocks.reduce<Partial<Record<BlockId, number[]>>>((paragraphs, id) => {
    paragraphs[id] = apiPreviews[id]?.paragrafosRecuados || [];
    return paragraphs;
  }, {});

  const previewBlocks = useMemo(
      () => buildPreviewBlocks(selectedClaimants, selectedDefendants, selectedLawyers, values, orderedSelectedBlocks, apiPreviewTexts, apiPreviewTitles, apiPreviewAttachments, apiPreviewFixedImages, apiPreviewIndentedParagraphs),
      [selectedClaimants, selectedDefendants, selectedLawyers, values, orderedSelectedBlocks, apiPreviewTexts, apiPreviewTitles, apiPreviewAttachments, apiPreviewFixedImages, apiPreviewIndentedParagraphs]
  );

  function handleChange(field: keyof ComposerState, value: string | string[]) {
    setValues((current) => ({ ...current, [field]: value as never }));
  }

  function addSiteEncerramento() {
    const site = siteEncerramentoInput.trim();
    if (!site) return;
    setSitesEncerramentoAtividades((current) => current.includes(site) ? current : [...current, site]);
    setSiteEncerramentoInput("");
  }

  function removeSiteEncerramento(site: string) {
    setSitesEncerramentoAtividades((current) => current.filter((item) => item !== site));
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
    const parentId = parentByChild[blockId];
    if (parentId && !selectedBlocks.includes(parentId)) return;

    const isSelected = selectedBlocks.includes(blockId);
    const childIds = blockRelationships[blockId]?.children || [];
    setSelectedBlocks((current) =>
        isSelected
            ? current.filter((item) => item !== blockId && !childIds.includes(item))
            : [...current, blockId]
    );
    if (isSelected && childIds.length > 0) {
      setValues((current) => {
        const next = { ...current };
        childIds.forEach((childId) => {
          (variableFieldsByBlock[childId] || []).forEach((field) => {
            next[field] = initialState[field] as never;
          });
        });
        return next;
      });
    }
    if (blockId === "ausencia_pagamento_verbas_rescisorias") {
      setSelectedSeveranceChildren((current) => current.length ? [] : current);
    }
  }

  function toggleSeveranceChild(blockId: BlockId) {
    setSelectedSeveranceChildren((current) =>
        current.includes(blockId)
            ? current.filter((item) => item !== blockId)
            : [...current, blockId]
    );
  }

  type AttachmentBlockId = "baixa_ctps_tutela" | "responsabilidade_solidaria_grupo_economico" | "responsabilidade_subsidiaria_contrato_administrativo" | "diferencas_salariais_piso_convencional" | "dispensa_discriminatoria_reintegracao_ou_pagamento" | "desvio_funcao_atividade_efetivamente_exercida" | "integracao_aluguel_veiculo_particular_natureza_salarial" | "dano_moral_atraso_salarial" | "verbas_rescisorias_media_horas_extras_nao_paga" | "ausencia_depositos_fgts";

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>, blockId: AttachmentBlockId, grupo = "geral") {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (blockId === "ausencia_depositos_fgts") {
      setPendingExtratoFgtsFiles((current) => [...current, ...files]);
      return;
    }
    if (!processoId) {
      if (blockId === "baixa_ctps_tutela") {
        setPendingCtpsFiles((current) => [...current, ...files]);
      } else if (blockId === "responsabilidade_solidaria_grupo_economico") {
        setPendingResponsabilidadeFiles((current) => [...current, ...files]);
      } else if (blockId === "responsabilidade_subsidiaria_contrato_administrativo") {
        setPendingContratoAdministrativoFiles((current) => [...current, ...files]);
      } else if (blockId === "dispensa_discriminatoria_reintegracao_ou_pagamento") {
        setPendingDispensaDiscriminatoriaFiles((current) => [...current, ...files]);
      } else if (blockId === "desvio_funcao_atividade_efetivamente_exercida" && grupo === "cbo") {
        setPendingDesvioCboFiles((current) => [...current, ...files]);
      } else if (blockId === "desvio_funcao_atividade_efetivamente_exercida") {
        setPendingDesvioProvasFiles((current) => [...current, ...files]);
      } else if (blockId === "integracao_aluguel_veiculo_particular_natureza_salarial") {
        setPendingIntegracaoAluguelFiles((current) => [...current, ...files]);
      } else if (blockId === "dano_moral_atraso_salarial") {
        setPendingDanoMoralAtrasoFiles((current) => [...current, ...files]);
      } else if (blockId === "verbas_rescisorias_media_horas_extras_nao_paga") {
        setPendingTrctMediaHorasFiles((current) => [...current, ...files]);
      } else {
        setPendingDiferencasSalariaisFiles((current) => [...current, ...files]);
      }
      return;
    }
    if (!session) return;

    setUploadingAttachments(true);
    setError("");
    try {
      const uploaded = await api.uploadProcessoAnexos(session.token, Number(processoId), files, blockId, grupo);
      setApiPreviews((current) => ({
        ...current,
        [blockId]: {
          text: current[blockId]?.text || "",
          title: current[blockId]?.title || "",
          anexos: [...(current[blockId]?.anexos || []), ...uploaded],
          imagensFixas: current[blockId]?.imagensFixas || [],
          paragrafosRecuados: current[blockId]?.paragrafosRecuados || [],
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

  function handlePendingDiferencasSalariaisRemove(key: string) {
    setPendingDiferencasSalariaisFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingDispensaDiscriminatoriaRemove(key: string) {
    setPendingDispensaDiscriminatoriaFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingDesvioRemove(key: string, grupo: "cbo" | "provas") {
    if (grupo === "cbo") {
      setPendingDesvioCboFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
    } else {
      setPendingDesvioProvasFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
    }
  }

  function handlePendingIntegracaoAluguelRemove(key: string) {
    setPendingIntegracaoAluguelFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingDanoMoralAtrasoRemove(key: string) {
    setPendingDanoMoralAtrasoFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingTrctMediaHorasRemove(key: string) {
    setPendingTrctMediaHorasFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function handlePendingExtratoFgtsRemove(key: string) {
    setPendingExtratoFgtsFiles((current) => current.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key));
  }

  function movePendingExtratoFgts(index: number, direction: -1 | 1) {
    setPendingExtratoFgtsFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function movePersistedExtratoFgts(index: number, direction: -1 | 1) {
    setApiPreviews((current) => {
      const preview = current.ausencia_depositos_fgts;
      if (!preview) return current;
      const target = index + direction;
      if (target < 0 || target >= preview.anexos.length) return current;
      const anexos = [...preview.anexos];
      [anexos[index], anexos[target]] = [anexos[target], anexos[index]];
      return { ...current, ausencia_depositos_fgts: { ...preview, anexos: anexos.map((anexo, ordem) => ({ ...anexo, ordem })) } };
    });
  }

  function clearDraft() {
    setValues(initialState);
    setSelectedBlocks(defaultBlocks);
    setSelectedSeveranceChildren([]);
    setExistingProcesso(null);
    setApiPreviews({});
    setPendingCtpsFiles([]);
    setPendingResponsabilidadeFiles([]);
    setPendingContratoAdministrativoFiles([]);
    setPendingDiferencasSalariaisFiles([]);
    setPendingDispensaDiscriminatoriaFiles([]);
    setPendingDesvioCboFiles([]);
    setPendingDesvioProvasFiles([]);
    setPendingIntegracaoAluguelFiles([]);
    setPendingDanoMoralAtrasoFiles([]);
    setPendingTrctMediaHorasFiles([]);
    setPendingExtratoFgtsFiles([]);
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

  function validateRequiredBlockChoices() {
    if (selectedBlocks.includes("dispensa_discriminatoria_reintegracao_ou_pagamento") && !values.opcaoDesfecho) {
      setError("Selecione o desfecho pretendido no bloco de dispensa discriminatória.");
      return false;
    }
    if (selectedBlocks.includes("diarias_viagem") && !values.criterioProvaDiariasViagem) {
      setError("Selecione o critério de prova no bloco Diárias de viagem.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateRequiredBlockChoices()) return;
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
      if (pendingDiferencasSalariaisFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingDiferencasSalariaisFiles, "diferencas_salariais_piso_convencional");
        setPendingDiferencasSalariaisFiles([]);
      }
      if (pendingDispensaDiscriminatoriaFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingDispensaDiscriminatoriaFiles, "dispensa_discriminatoria_reintegracao_ou_pagamento");
        setPendingDispensaDiscriminatoriaFiles([]);
      }
      if (pendingDesvioCboFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingDesvioCboFiles, "desvio_funcao_atividade_efetivamente_exercida", "cbo");
        setPendingDesvioCboFiles([]);
      }
      if (pendingDesvioProvasFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingDesvioProvasFiles, "desvio_funcao_atividade_efetivamente_exercida", "provas");
        setPendingDesvioProvasFiles([]);
      }
      if (pendingIntegracaoAluguelFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingIntegracaoAluguelFiles, "integracao_aluguel_veiculo_particular_natureza_salarial", "geral");
        setPendingIntegracaoAluguelFiles([]);
      }
      if (pendingDanoMoralAtrasoFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingDanoMoralAtrasoFiles, "dano_moral_atraso_salarial", "geral");
        setPendingDanoMoralAtrasoFiles([]);
      }
      if (pendingTrctMediaHorasFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingTrctMediaHorasFiles, "verbas_rescisorias_media_horas_extras_nao_paga", "geral");
        setPendingTrctMediaHorasFiles([]);
      }
      if (pendingExtratoFgtsFiles.length > 0) {
        setUploadingAttachments(true);
        await api.uploadProcessoAnexos(session.token, savedProcessoId, pendingExtratoFgtsFiles, "ausencia_depositos_fgts", "provasExtratoFgts");
        setPendingExtratoFgtsFiles([]);
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
    if (!validateRequiredBlockChoices()) return;
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
          dadosVariaveis: buildApiVariablePayload(values, apiBlocksForRequest, sitesEncerramentoAtividades)
        });
        blocksForExport = previewBlocks.map((block) => {
          const latestBlock = latestPreview.blocos.find((item) => item.id === block.id);
          return latestBlock ? {
            ...block,
            title: latestBlock.titulo,
            content: latestBlock.texto,
            anexos: normalizePreviewAttachments(latestBlock.anexos),
            imagensFixas: latestBlock.imagensFixas || [],
            paragrafosRecuados: latestBlock.paragrafosRecuados || []
          } : block;
        });
      }
      const imageFilesByBlock = await getExportImageFiles(blocksForExport, {
        baixa_ctps_tutela: pendingCtpsFiles.map((file) => ({ file, grupo: "geral" })),
        responsabilidade_solidaria_grupo_economico: pendingResponsabilidadeFiles.map((file) => ({ file, grupo: "geral" })),
        responsabilidade_subsidiaria_contrato_administrativo: pendingContratoAdministrativoFiles.map((file) => ({ file, grupo: "geral" })),
        diferencas_salariais_piso_convencional: pendingDiferencasSalariaisFiles.map((file) => ({ file, grupo: "geral" })),
        dispensa_discriminatoria_reintegracao_ou_pagamento: pendingDispensaDiscriminatoriaFiles.map((file) => ({ file, grupo: "geral" })),
        desvio_funcao_atividade_efetivamente_exercida: [
          ...pendingDesvioCboFiles.map((file) => ({ file, grupo: "cbo" as const })),
          ...pendingDesvioProvasFiles.map((file) => ({ file, grupo: "provas" as const }))
        ],
        integracao_aluguel_veiculo_particular_natureza_salarial: pendingIntegracaoAluguelFiles.map((file) => ({ file, grupo: "geral" })),
        dano_moral_atraso_salarial: pendingDanoMoralAtrasoFiles.map((file) => ({ file, grupo: "geral" })),
        verbas_rescisorias_media_horas_extras_nao_paga: pendingTrctMediaHorasFiles.map((file) => ({ file, grupo: "geral" })),
        ausencia_depositos_fgts: pendingExtratoFgtsFiles.map((file) => ({ file, grupo: "provasExtratoFgts" }))
      });
      await exportToDocx(
          blocksForExport,
          selectedClaimants.map((item) => item.nome).join(", ") || "reclamatoria",
          session.token,
          imageFilesByBlock,
          {
            processoId: processoId ? Number(processoId) : null,
            reclamantesIds: values.claimantIds.map(Number),
            reclamadasIds: values.defendantIds.map(Number),
            advogadosIds: values.advogadoIds.map(Number),
            blocosSelecionados: apiBlocksForRequest,
            dadosVariaveis: buildApiVariablePayload(values, apiBlocksForRequest, sitesEncerramentoAtividades)
          }
      );
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : "Falha ao exportar o documento.";
      setError(message);
    } finally {
      setExportingDocx(false);
    }
  }

  async function handleExportProcuracao() {
    if (!values.claimantIds.length || !values.defendantIds.length || !values.advogadoIds.length) {
      setError("Selecione ao menos um reclamante, uma reclamada e um advogado antes de exportar.");
      return;
    }
    setExportingProcuracao(true);
    setError("");
    try {
      if (!session) throw new Error("Falha ao exportar a procuração.");
      const { blob, filename } = await api.exportProcuracao(session.token, {
        processoId: processoId ? Number(processoId) : null,
        reclamantesIds: values.claimantIds.map(Number),
        reclamadasIds: values.defendantIds.map(Number),
        advogadosIds: values.advogadoIds.map(Number)
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Falha ao exportar a procuração.");
    } finally {
      setExportingProcuracao(false);
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
              <button
                  className="ghost-button ghost-button-light"
                  type="button"
                  onClick={() => {
                    void handleExportProcuracao();
                  }}
                  disabled={exportingProcuracao || !values.claimantIds.length || !values.defendantIds.length || !values.advogadoIds.length}
              >
                {exportingProcuracao ? "Exportando..." : "PROCURAÇÃO AD JUDICIA"}
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
                          {blocks.map((block) => {
                            const parentId = parentByChild[block.id];
                            if (parentId && !selectedBlocks.includes(parentId)) return null;
                            return (
                              <div className={`block-accordion ${selectedBlocks.includes(block.id) ? "is-open" : ""} ${parentId ? "is-child-block" : ""}`} key={block.id}>
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
                                {block.id === "ausencia_pagamento_verbas_rescisorias" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-suboptions">
                                      {[
                                        ["verbas_rescisorias_aviso_previo", "Aviso prévio indenizado", "qtdDiasAviso", "Quantidade de dias do aviso prévio"],
                                        ["verbas_rescisorias_ferias", "Férias + 1/3", "detalheFerias", "Detalhe das férias (meses/avos, vencidas ou dobra)"],
                                        ["verbas_rescisorias_decimo_terceiro", "13º Salário", "detalheDecimoTerceiro", "Detalhe do 13º salário (meses/avos ou vencido)"],
                                        ["verbas_rescisorias_multa_fgts", "Multa de 40% do FGTS", null, null],
                                        ["verbas_rescisorias_multas_467_477", "Multas dos arts. 467 e 477, § 8º, da CLT", null, null]
                                      ].map(([childId, title, field, label]) => (
                                          <div className="block-suboption" key={childId}>
                                            <label className="checkbox-card stacked">
                                              <input type="checkbox" checked={selectedSeveranceChildren.includes(childId as BlockId)} onChange={() => toggleSeveranceChild(childId as BlockId)} />
                                              <div><strong>{title}</strong></div>
                                            </label>
                                            {field && selectedSeveranceChildren.includes(childId as BlockId) ? (
                                                <label className="block-suboption-field">
                                                  {label}
                                                  <input type="text" value={String(values[field as keyof ComposerState] ?? "")} onChange={(event) => handleChange(field as keyof ComposerState, event.target.value)} />
                                                </label>
                                            ) : null}
                                          </div>
                                      ))}
                                    </div>
                                ) : null}
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
                                {block.id === "diferencas_salariais_piso_convencional" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar print de holerite, CCT e tabela de diferenças"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "diferencas_salariais_piso_convencional")} />
                                      </label>
                                      {!processoId ? <small>Os prints serão enviados ao salvar a RT.</small> : null}
                                      {apiPreviews.diferencas_salariais_piso_convencional?.anexos.length || pendingDiferencasSalariaisPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.diferencas_salariais_piso_convencional?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "diferencas_salariais_piso_convencional")}>×</button>
                                                </div>
                                            ))}
                                            {pendingDiferencasSalariaisPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingDiferencasSalariaisRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "dispensa_discriminatoria_reintegracao_ou_pagamento" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar prova(s) da dispensa discriminatória"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "dispensa_discriminatoria_reintegracao_ou_pagamento")} />
                                      </label>
                                      {!processoId ? <small>As provas serão enviadas ao salvar a RT.</small> : null}
                                      {apiPreviews.dispensa_discriminatoria_reintegracao_ou_pagamento?.anexos.length || pendingDispensaDiscriminatoriaPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.dispensa_discriminatoria_reintegracao_ou_pagamento?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "dispensa_discriminatoria_reintegracao_ou_pagamento")}>×</button>
                                                </div>
                                            ))}
                                            {pendingDispensaDiscriminatoriaPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingDispensaDiscriminatoriaRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "desvio_funcao_atividade_efetivamente_exercida" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      {(["cbo", "provas"] as const).map((grupo) => {
                                        const persisted = (apiPreviews[block.id]?.anexos || []).filter((anexo) => anexo.grupo === grupo);
                                        const pending = grupo === "cbo" ? pendingDesvioCboPreviews : pendingDesvioProvasPreviews;
                                        const label = grupo === "cbo" ? "Prints da CBO" : "Provas";
                                        return <div key={grupo}>
                                          <label className="attachment-upload-button">
                                            <span>{uploadingAttachments ? "Enviando..." : `Anexar ${label}`}</span>
                                            <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "desvio_funcao_atividade_efetivamente_exercida", grupo)} />
                                          </label>
                                          {!processoId ? <small>{label} serão enviados ao salvar a RT.</small> : null}
                                          {persisted.length || pending.length ? <div className="block-attachment-thumbnails">
                                            {persisted.map((anexo) => <div className="block-attachment-thumbnail" key={anexo.id}>
                                              <img src={anexo.url} alt={anexo.nomeOriginal} />
                                              <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "desvio_funcao_atividade_efetivamente_exercida")}>×</button>
                                            </div>)}
                                            {pending.map(({ file, key, url }) => <div className="block-attachment-thumbnail" key={key}>
                                              <img src={url} alt={file.name} />
                                              <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingDesvioRemove(key, grupo)}>×</button>
                                            </div>)}
                                          </div> : null}
                                        </div>;
                                      })}
                                    </div>
                                ) : null}
                                {block.id === "integracao_aluguel_veiculo_particular_natureza_salarial" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar prova(s) do aluguel do veículo"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "integracao_aluguel_veiculo_particular_natureza_salarial")} />
                                      </label>
                                      {!processoId ? <small>As provas serão enviadas ao salvar a RT.</small> : null}
                                      {apiPreviews.integracao_aluguel_veiculo_particular_natureza_salarial?.anexos.length || pendingIntegracaoAluguelPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.integracao_aluguel_veiculo_particular_natureza_salarial?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "integracao_aluguel_veiculo_particular_natureza_salarial")}>×</button>
                                                </div>
                                            ))}
                                            {pendingIntegracaoAluguelPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingIntegracaoAluguelRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "dano_moral_atraso_salarial" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar prova(s) do atraso salarial"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "dano_moral_atraso_salarial")} />
                                      </label>
                                      {!processoId ? <small>As provas serão enviadas ao salvar a RT.</small> : null}
                                      {apiPreviews.dano_moral_atraso_salarial?.anexos.length || pendingDanoMoralAtrasoPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.dano_moral_atraso_salarial?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "dano_moral_atraso_salarial")}>×</button>
                                                </div>
                                            ))}
                                            {pendingDanoMoralAtrasoPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingDanoMoralAtrasoRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "verbas_rescisorias_media_horas_extras_nao_paga" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>{uploadingAttachments ? "Enviando..." : "Anexar Prints do TRCT"}</span>
                                        <input type="file" accept="image/jpeg,image/png" multiple disabled={uploadingAttachments} onChange={(event) => handleAttachmentUpload(event, "verbas_rescisorias_media_horas_extras_nao_paga")} />
                                      </label>
                                      {!processoId ? <small>Os prints serão enviados ao salvar a RT.</small> : null}
                                      {apiPreviews.verbas_rescisorias_media_horas_extras_nao_paga?.anexos.length || pendingTrctMediaHorasPreviews.length ? (
                                          <div className="block-attachment-thumbnails">
                                            {(apiPreviews.verbas_rescisorias_media_horas_extras_nao_paga?.anexos || []).map((anexo) => (
                                                <div className="block-attachment-thumbnail" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <button type="button" aria-label={`Remover ${anexo.nomeOriginal}`} onClick={() => handleAttachmentRemove(anexo.id, "verbas_rescisorias_media_horas_extras_nao_paga")}>×</button>
                                                </div>
                                            ))}
                                            {pendingTrctMediaHorasPreviews.map(({ file, key, url }) => (
                                                <div className="block-attachment-thumbnail" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <button type="button" aria-label={`Remover ${file.name}`} onClick={() => handlePendingTrctMediaHorasRemove(key)}>×</button>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                {block.id === "ausencia_depositos_fgts" && selectedBlocks.includes(block.id) ? (
                                    <div className="block-attachment-picker">
                                      <label className="attachment-upload-button">
                                        <span>Anexar extrato do FGTS</span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png"
                                            multiple
                                            onChange={(event) => handleAttachmentUpload(event, "ausencia_depositos_fgts", "provasExtratoFgts")}
                                        />
                                      </label>
                                      <small>Os prints permanecem neste rascunho e serão enviados somente ao salvar a RT.</small>
                                      {(apiPreviews.ausencia_depositos_fgts?.anexos.length || pendingExtratoFgtsPreviews.length) ? (
                                          <div className="ordered-attachment-list">
                                            {(apiPreviews.ausencia_depositos_fgts?.anexos || []).map((anexo, index, anexos) => (
                                                <div className="ordered-attachment-item" key={anexo.id}>
                                                  <img src={anexo.url} alt={anexo.nomeOriginal} />
                                                  <span title={anexo.nomeOriginal}>{anexo.nomeOriginal}</span>
                                                  <div className="ordered-attachment-actions">
                                                    <button type="button" disabled={index === 0} onClick={() => movePersistedExtratoFgts(index, -1)} aria-label={`Mover ${anexo.nomeOriginal} para cima`}>↑</button>
                                                    <button type="button" disabled={index === anexos.length - 1} onClick={() => movePersistedExtratoFgts(index, 1)} aria-label={`Mover ${anexo.nomeOriginal} para baixo`}>↓</button>
                                                    <button type="button" onClick={() => handleAttachmentRemove(anexo.id, "ausencia_depositos_fgts")}>Remover</button>
                                                  </div>
                                                </div>
                                            ))}
                                            {pendingExtratoFgtsPreviews.map(({ file, key, url }, index, arquivos) => (
                                                <div className="ordered-attachment-item" key={key}>
                                                  <img src={url} alt={file.name} />
                                                  <span title={file.name}>{file.name}</span>
                                                  <div className="ordered-attachment-actions">
                                                    <button type="button" disabled={index === 0} onClick={() => movePendingExtratoFgts(index, -1)} aria-label={`Mover ${file.name} para cima`}>↑</button>
                                                    <button type="button" disabled={index === arquivos.length - 1} onClick={() => movePendingExtratoFgts(index, 1)} aria-label={`Mover ${file.name} para baixo`}>↓</button>
                                                    <button type="button" onClick={() => handlePendingExtratoFgtsRemove(key)}>Remover</button>
                                                  </div>
                                                </div>
                                            ))}
                                          </div>
                                      ) : null}
                                    </div>
                                ) : null}
                                <div className="block-accordion-content">
                                  {block.id === "rescisao_indireta_tutela_antecipada_verbas_incontroversas" && selectedBlocks.includes(block.id) ? (
                                      <div className="block-variable-fields">
                                        <label>
                                          Sites que noticiam o encerramento das atividades da ré
                                          <input
                                              type="url"
                                              value={siteEncerramentoInput}
                                              onChange={(event) => setSiteEncerramentoInput(event.target.value)}
                                              onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                  event.preventDefault();
                                                  addSiteEncerramento();
                                                }
                                              }}
                                              placeholder="https://exemplo.com/noticia"
                                          />
                                        </label>
                                        <button type="button" onClick={addSiteEncerramento}>Adicionar site</button>
                                        {sitesEncerramentoAtividades.length > 0 ? (
                                            <div className="selected-entities-grid">
                                              {sitesEncerramentoAtividades.map((site) => (
                                                  <div className="selected-summary-card" key={site}>
                                                    <span>{site}</span>
                                                    <button className="inline-remove-button" type="button" onClick={() => removeSiteEncerramento(site)}>
                                                      Remover
                                                    </button>
                                                  </div>
                                              ))}
                                            </div>
                                        ) : null}
                                      </div>
                                  ) : null}
                                  {block.id === "dispensa_discriminatoria_reintegracao_ou_pagamento" && selectedBlocks.includes(block.id) ? (
                                      <div className="form-grid block-variable-fields">
                                        <label className="checkbox-card">
                                          <input
                                              type="checkbox"
                                              checked={values.incluirJurisprudenciaDoenca}
                                              onChange={(event) => setValues((current) => ({ ...current, incluirJurisprudenciaDoenca: event.target.checked }))}
                                          />
                                          <span>Incluir jurisprudência sobre discriminação por doença/HIV (Súmula 443 do TST)</span>
                                        </label>
                                        <label>
                                          Desfecho pretendido
                                          <select
                                              value={values.opcaoDesfecho}
                                              aria-invalid={!values.opcaoDesfecho}
                                              onChange={(event) => setValues((current) => ({ ...current, opcaoDesfecho: event.target.value as ComposerState["opcaoDesfecho"] }))}
                                          >
                                            <option value="">Selecione um desfecho</option>
                                            <option value="reintegracao">Reintegração no emprego (art. 4º, I, Lei 9.029/1995)</option>
                                            <option value="pagamento_dobro">Pagamento em dobro do período de afastamento (art. 4º, II, Lei 9.029/1995)</option>
                                          </select>
                                        </label>
                                      </div>
                                  ) : null}
                                  {block.id === "diarias_viagem" && selectedBlocks.includes(block.id) ? (
                                      <fieldset className="exclusive-choice-group" aria-invalid={!values.criterioProvaDiariasViagem}>
                                        <legend>Critério de prova das diárias de viagem</legend>
                                        <label className="checkbox-card">
                                          <input
                                              type="radio"
                                              name="criterioProvaDiariasViagem"
                                              value="CONTROLES_JORNADA"
                                              checked={values.criterioProvaDiariasViagem === "CONTROLES_JORNADA"}
                                              onChange={() => setValues((current) => ({ ...current, criterioProvaDiariasViagem: "CONTROLES_JORNADA" }))}
                                          />
                                          <span>Solicitar controles de jornada e informar média de viagens</span>
                                        </label>
                                        <label className="checkbox-card">
                                          <input
                                              type="radio"
                                              name="criterioProvaDiariasViagem"
                                              value="PRESTACOES_CONTAS"
                                              checked={values.criterioProvaDiariasViagem === "PRESTACOES_CONTAS"}
                                              onChange={() => setValues((current) => ({ ...current, criterioProvaDiariasViagem: "PRESTACOES_CONTAS" }))}
                                          />
                                          <span>Solicitar prestações de contas e adotar 26 dias por mês</span>
                                        </label>
                                        {!values.criterioProvaDiariasViagem ? <small>Selecione uma opção para salvar ou exportar este bloco.</small> : null}
                                      </fieldset>
                                  ) : null}
                                  {block.id === "adicional_transferencia" && values.dataInicioTransferencia && values.dataFimTransferencia ? (
                                      <p>
                                        DE {formatDate(values.dataInicioTransferencia)} a {formatDate(values.dataFimTransferencia)}
                                      </p>
                                  ) : null}
                                  <div className="form-grid block-variable-fields">
                                    {(variableFieldsByBlock[block.id] ?? []).filter((field) =>
                                      !["motivoExtincao", "incluirJurisprudenciaDoenca", "opcaoDesfecho", "criterioProvaDiariasViagem"].includes(field)
                                      && !(block.id === "diarias_viagem" && field === "mediaViagensMensais" && values.criterioProvaDiariasViagem !== "CONTROLES_JORNADA")
                                    ).map((field) => {
                                      const labels: Partial<Record<keyof ComposerState, string>> = {
                                        dataAdmissao: "Data de admissão",
                                        dataInicioAcumuloFuncao: "Data de início do acúmulo de função",
                                        funcaoAdicional: "Função adicional exercida",
                                        formaRecebimento: "Forma de recebimento do valor 'por fora'",
                                        valorMedioMensal: "Valor médio mensal recebido 'por fora'",
                                        valorAluguelVeiculo: "Valor do aluguel do veículo",
                                        descricaoProvaAluguelVeiculo: "Descrição da prova do aluguel do veículo",
                                        localidadeTransferencia: "Localidade da transferência",
                                        dataInicioTransferencia: "Data de início da transferência",
                                        dataFimTransferencia: "Data de fim da transferência",
                                        descricaoJornadaMedia: "Descrição da jornada média",
                                        descricaoAusenciaControleJornada: "Descrição da ausência de controle de jornada",
                                        descricaoNulidadeBancoHoras: "Descrição da nulidade do banco de horas",
                                        horarioTrabalhoNoturno: "Horário de trabalho noturno",
                                        descricaoChamadosSobreaviso: "Descrição dos chamados em sobreaviso",
                                        descricaoSupressaoIntervaloInterjornada: "Descrição da supressão do intervalo interjornada",
                                        horasDiariasIntervaloIntrajornada: "Total de horas diárias de intervalo intrajornada",
                                        mediaHorasJornadaDiaria: "Média de horas trabalhadas por dia",
                                        descricaoAmbienteTrabalhoNocivo: "Descrição do ambiente de trabalho nocivo",
                                        clausulaCctDiariasViagem: "Cláusula da CCT",
                                        identificacaoCctDiariasViagem: "Identificação da CCT",
                                        textoClausulaDiariasViagem: "Conteúdo da cláusula",
                                        mediaViagensMensais: "Média de viagens realizadas por mês",
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
                                        funcaoEfetivamenteExercida: "Função efetivamente exercida",
                                        remuneracao: "Última remuneração",
                                        motivoExtincao: "Motivo da extinção do vínculo",
                                        dataExtincao: "Data de extinção do vínculo",
                                        informacoesComplementares: "Informações complementares",
                                        informacoesComplementaresCtps: "Informações complementares",
                                        informacoesComplementaresContratoAdministrativo: "Informações complementares",
                                        descricaoAtividadePrincipal: "Descrição da atividade principal",
                                        objetoContratoAdministrativo: "Objeto do contrato administrativo",
                                        clausulaNumeroContrato: "Cláusula e número do contrato",
                                        fornecimentoPrestadora: "O que é fornecido pela prestadora",
                                        motivoNaoEventualidade: "Motivo da não eventualidade",
                                        motivoOnerosidade: "Motivo da onerosidade",
                                        motivoSubordinacao: "Motivo da subordinação",
                                        dataInicioVinculo: "Data de início do vínculo",
                                        dataFimVinculo: "Data de fim do vínculo",
                                        dataAnotacaoCtps: "Data de anotação da CTPS",
                                        dataInicioPrestacaoServicos: "Data de início da prestação de serviços",
                                        descricaoDanoMoralCtps: "Descrição do dano/constrangimento sofrido",
                                        dataAssinaturaCarteira: "Data de assinatura da carteira",
                                        cctReferencia: "CCT de referência",
                                        justificativaRescisaoIndireta: "Justificativa da rescisão indireta",
                                        descricaoFaltaGrave: "Descrição da falta grave do empregador",
                                        motivoJustaCausa: "Motivo da justa causa",
                                        condicaoDiscriminacao: "Condição da parte autora que motivou a dispensa",
                                        comoFicouProvado: "Como ficou comprovado"
                                      };
                                      const multiline = ["descricaoAcidente", "redacaoClausula", "informacoesComplementares", "informacoesComplementaresCtps", "informacoesComplementaresContratoAdministrativo", "descricaoAtividadePrincipal", "motivoSubordinacao", "descricaoDanoMoralCtps", "justificativaRescisaoIndireta", "descricaoFaltaGrave", "motivoJustaCausa", "descricaoJornadaMedia", "descricaoAusenciaControleJornada", "descricaoNulidadeBancoHoras", "horarioTrabalhoNoturno", "descricaoChamadosSobreaviso", "descricaoSupressaoIntervaloInterjornada", "descricaoAmbienteTrabalhoNocivo", "textoClausulaDiariasViagem"].includes(field);
                                      const isDate = ["dataAdmissao", "dataDemissao", "dataContratacao", "dataExtincao", "dataInicioVinculo", "dataFimVinculo", "dataAnotacaoCtps", "dataInicioPrestacaoServicos", "dataAssinaturaCarteira", "dataInicioAcumuloFuncao", "dataInicioTransferencia", "dataFimTransferencia"].includes(field);
                                      const accumulationLabels: Partial<Record<keyof ComposerState, string>> = {
                                        funcaoContrato: "Função contratada",
                                        funcaoEfetivamenteExercida: "Função acumulada",
                                        salarioFuncaoOriginal: "Salário da função contratada",
                                        salarioFuncaoAcumulada: "Salário da função acumulada",
                                        remuneracao: "Salário atual da autora"
                                      };
                                      const fieldLabel = block.id === "desvio_funcao_atividade_efetivamente_exercida" && field === "funcaoContrato"
                                          ? "Função registrada"
                                          : block.id === "diferencas_salariais_acumulo_funcoes"
                                              ? accumulationLabels[field] || labels[field]
                                              : labels[field];
                                      const isMoney = block.id === "diferencas_salariais_acumulo_funcoes" && ["salarioFuncaoOriginal", "salarioFuncaoAcumulada", "remuneracao"].includes(field);
                                      const isLatereMoney = block.id === "salario_a_latere" && field === "valorMedioMensal";
                                      const isVehicleRentalMoney = block.id === "integracao_aluguel_veiculo_particular_natureza_salarial" && field === "valorAluguelVeiculo";
                                      return (
                                          <label className={["informacoesComplementares", "informacoesComplementaresCtps", "informacoesComplementaresContratoAdministrativo"].includes(field) ? "field-wide" : undefined} key={field}>
                                            {fieldLabel}
                                            {multiline ? (
                                                <textarea
                                                    rows={4}
                                                    value={String(values[field] ?? "")}
                                                    placeholder={field === "descricaoSupressaoIntervaloInterjornada" ? "Descreva como ocorria a supressão do intervalo interjornada" : field === "descricaoAmbienteTrabalhoNocivo" ? "Descreva como e em quais condições a parte autora trabalhava" : undefined}
                                                    onChange={(event) => handleChange(field, event.target.value)}
                                                />
                                            ) : (
                                                <input
                                                    type={isDate ? "date" : field === "remuneracao" || isMoney || isLatereMoney || isVehicleRentalMoney ? "number" : "text"}
                                                    step={field === "remuneracao" || isMoney || isLatereMoney || isVehicleRentalMoney ? "0.01" : undefined}
                                                    min={field === "remuneracao" || isMoney || isLatereMoney || isVehicleRentalMoney ? "0" : undefined}
                                                    value={String(values[field] ?? "")}
                                                    placeholder={field === "horasDiariasIntervaloIntrajornada" ? "Ex.: 3 horas e 30 minutos" : field === "mediaHorasJornadaDiaria" ? "Ex.: 12 horas" : undefined}
                                                    onChange={(event) => handleChange(field, event.target.value)}
                                                />
                                            )}
                                          </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                        {renderBlockContent(block.content, block.anexos, block.imagensFixas, [
                          "baixa_ctps_tutela",
                          "responsabilidade_solidaria_grupo_economico",
                          "responsabilidade_subsidiaria_contrato_administrativo",
                          "diferencas_salariais_piso_convencional",
                          "integracao_aluguel_veiculo_particular_natureza_salarial",
                          "dano_moral_atraso_salarial",
                          "verbas_rescisorias_media_horas_extras_nao_paga",
                          "ausencia_depositos_fgts"
                        ].includes(block.id), session?.token || "", block.id, block.paragrafosRecuados)}
                      </section>
                  ))}
                </article>
              </SectionCard>
            </div>
        ) : null}
      </AppShell>
  );
}
