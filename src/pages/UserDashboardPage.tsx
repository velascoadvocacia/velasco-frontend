import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";
import type { MovimentacaoResponse, Processo } from "../types/api";

interface UserDashboardState {
  processos: Processo[];
  movimentacoes: MovimentacaoResponse[];
}

export function UserDashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<UserDashboardState>({ processos: [], movimentacoes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!session) return;

      setLoading(true);
      setError("");

      try {
        const processoParams =
          session.usuario.perfil === "ADVOGADO"
            ? { size: 6, advogadoId: session.usuario.pessoa.id }
            : { size: 6 };

        const [processosResponse, movimentacoesResponse] = await Promise.all([
          api.getProcessos(session.token, processoParams),
          api.getMovimentacoes(session.token, 0, 8)
        ]);

        setData({
          processos: processosResponse.items,
          movimentacoes: movimentacoesResponse.items
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [session]);

  const abertos = data.processos.filter((item) => item.status !== "FINALIZADO").length;

  return (
    <AppShell
      title="Dashboard do usuário"
      subtitle="Visão operacional para advogado ou assistente conectada aos endpoints de processos e movimentações."
      actions={
        <Link className="primary-button" to={data.processos[0] ? `/preview/${data.processos[0].id}` : "/dashboard"}>
          Abrir preview
        </Link>
      }
    >
      {loading ? <div className="loading-panel">Carregando dados do painel...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!loading ? (
        <>
          <section className="stats-grid">
            <StatCard label="Processos em foco" value={data.processos.length} helper="Amostra recente da sua fila." />
            <StatCard label="Casos ativos" value={abertos} helper="Itens ainda não finalizados." />
            <StatCard
              label="Movimentações"
              value={data.movimentacoes.length}
              helper="Últimos eventos retornados pela API."
            />
          </section>

          <div className="content-grid">
            <SectionCard
              title="Processos recentes"
              description="Lista trazida de `/processos`, com atalho direto para a tela de preview."
            >
              <div className="table-list">
                {data.processos.map((processo) => (
                  <Link className="list-row interactive-row" key={processo.id} to={`/preview/${processo.id}`}>
                    <div>
                      <strong>{processo.numeroProcesso}</strong>
                      <p>{processo.cliente.nome}</p>
                    </div>
                    <div>
                      <StatusBadge value={processo.status} />
                      <span>{formatDate(processo.dataAbertura)}</span>
                    </div>
                  </Link>
                ))}
                {!data.processos.length ? <p className="empty-message">Nenhum processo encontrado.</p> : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Feed de movimentações"
              description="Acompanhamento rápido dos últimos eventos registrados no backend."
            >
              <div className="timeline">
                {data.movimentacoes.map((movimentacao) => (
                  <article className="timeline-item" key={movimentacao.id}>
                    <strong>{movimentacao.processo.numeroProcesso}</strong>
                    <p>{movimentacao.descricao}</p>
                    <span>{formatDateTime(movimentacao.dataMovimentacao)}</span>
                  </article>
                ))}
                {!data.movimentacoes.length ? (
                  <p className="empty-message">Nenhuma movimentação retornada.</p>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
