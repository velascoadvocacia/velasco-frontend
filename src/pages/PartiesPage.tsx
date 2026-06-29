import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { PartyProcessLink, PartySummary, Processo } from "../types/api";

function buildClaimants(processos: Processo[]): PartySummary[] {
  const map = new Map<number, PartySummary>();

  processos.forEach((processo) => {
    const current = map.get(processo.reclamante.id);
    const link: PartyProcessLink = {
      id: processo.id,
      numeroProcesso: processo.numeroProcesso,
      descricao: processo.descricao,
      status: processo.status,
      clienteNome: processo.cliente.nome,
      advogadoNome: processo.advogado.nome,
      dataAbertura: processo.dataAbertura
    };

    if (current) {
      current.processos.push(link);
      current.totalProcessos = current.processos.length;
      return;
    }

    map.set(processo.reclamante.id, {
      pessoa: processo.reclamante,
      totalProcessos: 1,
      processos: [link]
    });
  });

  return [...map.values()].sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome));
}

function buildDefendants(processos: Processo[]): PartySummary[] {
  const map = new Map<number, PartySummary>();

  processos.forEach((processo) => {
    processo.reclamadas.forEach((reclamada) => {
      const current = map.get(reclamada.id);
      const link: PartyProcessLink = {
        id: processo.id,
        numeroProcesso: processo.numeroProcesso,
        descricao: processo.descricao,
        status: processo.status,
        clienteNome: processo.cliente.nome,
        advogadoNome: processo.advogado.nome,
        dataAbertura: processo.dataAbertura
      };

      if (current) {
        current.processos.push(link);
        current.totalProcessos = current.processos.length;
        return;
      }

      map.set(reclamada.id, {
        pessoa: reclamada,
        totalProcessos: 1,
        processos: [link]
      });
    });
  });

  return [...map.values()].sort((a, b) => b.totalProcessos - a.totalProcessos || a.pessoa.nome.localeCompare(b.pessoa.nome));
}

export function PartiesPage() {
  const { session } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!session) return;

      setLoading(true);
      setError("");

      try {
        const response = await api.getProcessos(session.token, { page: 0, size: 200 });
        setProcessos(response.items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar partes.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [session]);

  const claimants = useMemo(() => buildClaimants(processos), [processos]);
  const defendants = useMemo(() => buildDefendants(processos), [processos]);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredClaimants = useMemo(
    () =>
      claimants.filter((item) =>
        item.pessoa.nome.toLowerCase().includes(normalizedSearch)
      ),
    [claimants, normalizedSearch]
  );

  const filteredDefendants = useMemo(
    () =>
      defendants.filter((item) =>
        item.pessoa.nome.toLowerCase().includes(normalizedSearch)
      ),
    [defendants, normalizedSearch]
  );

  return (
    <AppShell
      title="Partes e processos"
      subtitle="Consulta consolidada de reclamantes e reclamadas com vínculos processuais."
    >
      <section className="stats-grid">
        <StatCard
          label="Reclamantes"
          value={claimants.length}
          helper="Partes ativas encontradas nos processos carregados."
        />
        <StatCard
          label="Reclamadas"
          value={defendants.length}
          helper="Empresas ou partes reclamadas vinculadas aos casos."
        />
        <StatCard
          label="Processos lidos"
          value={processos.length}
          helper="Base usada para montar a visão desta tela."
        />
      </section>

      <SectionCard
        title="Buscar parte"
        description="Filtre por nome para localizar reclamantes ou reclamadas mais rápido."
      >
        <input
          className="search-input"
          placeholder="Buscar por nome da parte"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </SectionCard>

      {loading ? <div className="loading-panel">Carregando partes e relacionamentos...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!loading ? (
        <div className="content-grid">
          <SectionCard
            title="Reclamantes cadastrados"
            description="Agrupamento por reclamante com quantidade de processos em que aparece."
          >
            <div className="party-list">
              {filteredClaimants.map((item) => (
                <article className="party-card" key={`claimant-${item.pessoa.id}`}>
                  <div className="party-card-header">
                    <div>
                      <strong>{item.pessoa.nome}</strong>
                      <p>{item.pessoa.tipoPessoa}</p>
                    </div>
                    <StatusBadge value={`${item.totalProcessos} processo${item.totalProcessos > 1 ? "s" : ""}`} />
                  </div>

                  <div className="linked-processes">
                    {item.processos.map((processo) => (
                      <Link className="linked-process-row" key={processo.id} to={`/preview/${processo.id}`}>
                        <div>
                          <strong>{processo.numeroProcesso}</strong>
                          <p>{processo.clienteNome}</p>
                        </div>
                        <span>{formatDate(processo.dataAbertura)}</span>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
              {!filteredClaimants.length ? (
                <p className="empty-message">Nenhum reclamante encontrado para o filtro atual.</p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Reclamadas e seus processos"
            description="Cada reclamada mostra os processos associados, com acesso direto ao preview."
          >
            <div className="party-list">
              {filteredDefendants.map((item) => (
                <article className="party-card" key={`defendant-${item.pessoa.id}`}>
                  <div className="party-card-header">
                    <div>
                      <strong>{item.pessoa.nome}</strong>
                      <p>{item.pessoa.tipoPessoa}</p>
                    </div>
                    <StatusBadge value={`${item.totalProcessos} processo${item.totalProcessos > 1 ? "s" : ""}`} />
                  </div>

                  <div className="linked-processes">
                    {item.processos.map((processo) => (
                      <Link className="linked-process-row" key={processo.id} to={`/preview/${processo.id}`}>
                        <div>
                          <strong>{processo.numeroProcesso}</strong>
                          <p>{processo.advogadoNome}</p>
                        </div>
                        <div className="linked-process-meta">
                          <StatusBadge value={processo.status} />
                          <span>{formatDate(processo.dataAbertura)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
              {!filteredDefendants.length ? (
                <p className="empty-message">Nenhuma reclamada encontrada para o filtro atual.</p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </AppShell>
  );
}
