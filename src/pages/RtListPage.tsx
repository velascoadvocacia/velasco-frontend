import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { Processo, StatusProcesso, Usuario } from "../types/api";

const statusOptions: Array<{ value: "" | StatusProcesso; label: string }> = [
  { value: "", label: "Todos" },
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "FINALIZADO", label: "Finalizado" }
];

interface ProcessoFilters {
  numeroProcesso?: string;
  advogadoId?: string;
  status?: StatusProcesso;
}

export function RtListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [advogadoId, setAdvogadoId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | StatusProcesso>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchProcessos(filters: ProcessoFilters = {}) {
    if (!session) return;

    setLoading(true);
    setError("");

    try {
      const params: {
        page: number;
        size: number;
        numeroProcesso?: string;
        advogadoId?: number;
        status?: string;
      } = { page: 0, size: 50 };

      const numero = filters.numeroProcesso?.trim();
      if (numero) {
        params.numeroProcesso = numero;
      }

      if (filters.advogadoId) {
        params.advogadoId = Number(filters.advogadoId);
      }

      if (filters.status) {
        params.status = filters.status;
      }

      const response = await api.getProcessos(session.token, params);
      const rts = response.items.filter((processo) => processo.numeroProcesso.startsWith("RT-"));
      setProcessos(rts);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Falha ao carregar RTs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      if (!session) return;

      try {
        const usuariosResponse = await api.getUsuarios(session.token, 0, 200);
        setUsuarios(
          usuariosResponse.items.filter((usuario) => usuario.perfil === "ADVOGADO" || usuario.perfil === "ADMIN")
        );
      } catch {
        // A lista de processos segue disponível mesmo se os advogados não carregarem.
      }

      await fetchProcessos();
    }

    void loadInitialData();
  }, [session]);

  async function handleSearch() {
    await fetchProcessos({
      numeroProcesso,
      advogadoId: advogadoId || undefined,
      status: statusFilter || undefined
    });
  }

  async function handleClear() {
    setNumeroProcesso("");
    setAdvogadoId("");
    setStatusFilter("");
    await fetchProcessos();
  }

  return (
    <AppShell
      title="Reclamatórias"
      subtitle="Gerencie suas reclamatórias trabalhistas"
      actions={
        <button className="primary-button" type="button" onClick={() => navigate("/rt/montar")}>
          Nova RT
        </button>
      }
    >
      <SectionCard title="Filtros" description="Busque por número do processo, advogado ou status.">
        <div className="party-form">
          <div className="form-grid">
            <label>
              Número do processo
              <input
                placeholder="Ex.: RT-1234567890"
                value={numeroProcesso}
                onChange={(event) => setNumeroProcesso(event.target.value)}
              />
            </label>

            <label>
              Advogado
              <select value={advogadoId} onChange={(event) => setAdvogadoId(event.target.value)}>
                <option value="">Todos</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.pessoa.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | StatusProcesso)}>
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="page-actions-cluster">
            <button className="primary-button" type="button" onClick={() => void handleSearch()} disabled={loading}>
              Buscar
            </button>
            <button
              className="ghost-button ghost-button-light"
              type="button"
              onClick={() => void handleClear()}
              disabled={loading}
            >
              Limpar
            </button>
          </div>
        </div>
      </SectionCard>

      {loading ? <div className="loading-panel">Carregando reclamatórias...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!loading ? (
        <SectionCard
          title="Reclamatórias salvas"
          description="Reclamatórias trabalhistas cadastradas no sistema."
        >
          <div className="table-list">
            {processos.map((processo) => (
              <div className="list-row interactive-row" key={processo.id} style={{ justifyContent: "space-between" }}>
                <strong>{processo.numeroProcesso}</strong>
                <span>{processo.cliente.nome}</span>
                <span>{formatDate(processo.dataAbertura)}</span>
                <StatusBadge value={processo.status} />
                <button
                  className="ghost-button ghost-button-light"
                  type="button"
                  onClick={() => navigate(`/rt/montar?processoId=${processo.id}`)}
                >
                  Editar
                </button>
              </div>
            ))}
            {!processos.length ? (
              <p className="empty-message">
                {numeroProcesso.trim() || advogadoId || statusFilter
                  ? "Nenhuma reclamatória encontrada para o filtro atual."
                  : "Nenhuma RT salva ainda."}
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
