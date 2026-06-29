import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";
import type { Processo } from "../types/api";

export function PreviewPage() {
  const { processoId } = useParams();
  const { session, isAdmin } = useAuth();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProcesso() {
      if (!session || !processoId) return;

      setLoading(true);
      setError("");

      try {
        const response = await api.getProcessoById(session.token, Number(processoId));
        setProcesso(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar preview.");
      } finally {
        setLoading(false);
      }
    }

    void loadProcesso();
  }, [processoId, session]);

  return (
    <AppShell
      title="Preview do processo"
      subtitle="Tela detalhada para consulta rápida do caso, timeline e estratégia processual."
      actions={
        <Link className="ghost-button" to={isAdmin ? "/admin" : "/dashboard"}>
          Voltar ao dashboard
        </Link>
      }
    >
      {loading ? <div className="loading-panel">Buscando detalhes do processo...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {processo ? (
        <div className="preview-stack">
          <section className="preview-hero">
            <div>
              <p className="eyebrow">Processo</p>
              <h2>{processo.numeroProcesso}</h2>
              <p>{processo.descricao}</p>
            </div>
            <div className="preview-hero-meta">
              <StatusBadge value={processo.status} />
              <span>Abertura em {formatDate(processo.dataAbertura)}</span>
            </div>
          </section>

          <div className="content-grid">
            <SectionCard title="Partes principais" description="Dados centrais para leitura rápida.">
              <div className="detail-grid">
                <div>
                  <span>Cliente</span>
                  <strong>{processo.cliente.nome}</strong>
                </div>
                <div>
                  <span>Advogado</span>
                  <strong>{processo.advogado.nome}</strong>
                </div>
                <div>
                  <span>Reclamante</span>
                  <strong>{processo.reclamante.nome}</strong>
                </div>
                <div>
                  <span>Responsável</span>
                  <strong>{processo.advogadoResponsavel.nome}</strong>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Relacionamentos" description="Partes jurídicas associadas ao caso.">
              <div className="chip-group">
                {processo.reclamadas.map((item) => (
                  <span className="chip" key={`reclamada-${item.id}`}>
                    Reclamada: {item.nome}
                  </span>
                ))}
                {processo.sociosResponsaveis.map((item) => (
                  <span className="chip" key={`socio-${item.id}`}>
                    Sócio: {item.nome}
                  </span>
                ))}
                {!processo.reclamadas.length && !processo.sociosResponsaveis.length ? (
                  <p className="empty-message">Nenhum relacionamento adicional cadastrado.</p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Contrato de trabalho" description="Informações laborais vinculadas ao caso.">
              {processo.contratoTrabalho ? (
                <div className="detail-grid">
                  <div>
                    <span>Função</span>
                    <strong>{processo.contratoTrabalho.funcaoExercida || "Não informada"}</strong>
                  </div>
                  <div>
                    <span>Horário</span>
                    <strong>{processo.contratoTrabalho.jornadaDescricao || "Não informado"}</strong>
                  </div>
                  <div>
                    <span>Admissão</span>
                    <strong>{formatDate(processo.contratoTrabalho.dataAdmissao)}</strong>
                  </div>
                  <div>
                    <span>Demissão</span>
                    <strong>{formatDate(processo.contratoTrabalho.dataDemissao)}</strong>
                  </div>
                </div>
              ) : (
                <p className="empty-message">Contrato de trabalho não informado.</p>
              )}
            </SectionCard>

            <SectionCard title="Estratégia processual" description="Objetivos e riscos para o caso.">
              {processo.estrategiaProcessual ? (
                <div className="strategy-stack">
                  <div>
                    <span>Fundamentos fáticos</span>
                    <p>{processo.estrategiaProcessual.fundamentosFaticos || "Não informado"}</p>
                  </div>
                  <div>
                    <span>Pedidos principais</span>
                    <p>{processo.estrategiaProcessual.pedidosPrincipais || "Não informado"}</p>
                  </div>
                  <div>
                    <span>Observações internas</span>
                    <p>{processo.estrategiaProcessual.observacoesInternas || "Não informado"}</p>
                  </div>
                </div>
              ) : (
                <p className="empty-message">Estratégia processual não cadastrada.</p>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Timeline do processo" description="Movimentações anexadas diretamente ao processo.">
            <div className="timeline">
              {processo.movimentacoes.map((movimentacao) => (
                <article className="timeline-item" key={movimentacao.id}>
                  <strong>{formatDateTime(movimentacao.dataMovimentacao)}</strong>
                  <p>{movimentacao.descricao}</p>
                </article>
              ))}
              {!processo.movimentacoes.length ? (
                <p className="empty-message">Nenhuma movimentação registrada para este processo.</p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </AppShell>
  );
}
