import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";
import type { MovimentacaoResponse, PessoaResponse, Processo, Usuario } from "../types/api";

interface AdminDashboardState {
  usuarios: Usuario[];
  pessoas: PessoaResponse[];
  processos: Processo[];
  movimentacoes: MovimentacaoResponse[];
  totalUsuarios: number;
  totalPessoas: number;
  totalProcessos: number;
}

export function AdminDashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<AdminDashboardState>({
    usuarios: [],
    pessoas: [],
    processos: [],
    movimentacoes: [],
    totalUsuarios: 0,
    totalPessoas: 0,
    totalProcessos: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAdminDashboard() {
      if (!session) return;

      setLoading(true);
      setError("");

      try {
        const [usuarios, pessoas, processos, movimentacoes] = await Promise.all([
          api.getUsuarios(session.token),
          api.getPessoas(session.token),
          api.getProcessos(session.token, { size: 8 }),
          api.getMovimentacoes(session.token, 0, 8)
        ]);

        setData({
          usuarios: usuarios.items,
          pessoas: pessoas.items,
          processos: processos.items,
          movimentacoes: movimentacoes.items,
          totalUsuarios: usuarios.totalItems,
          totalPessoas: pessoas.totalItems,
          totalProcessos: processos.totalItems
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar dashboard admin.");
      } finally {
        setLoading(false);
      }
    }

    void loadAdminDashboard();
  }, [session]);

  return (
    <AppShell
      title="Dashboard administrativo"
      subtitle="Painel consolidado para administração de usuários, pessoas e processos protegidos por role ADMIN."
      actions={
        <Link className="primary-button" to={data.processos[0] ? `/preview/${data.processos[0].id}` : "/admin"}>
          Pré-visualizar processo
        </Link>
      }
    >
      {loading ? <div className="loading-panel">Carregando visão administrativa...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!loading ? (
        <>
          <section className="stats-grid">
            <StatCard label="Usuários" value={data.totalUsuarios} helper="Retorno de `/usuarios`." />
            <StatCard label="Pessoas" value={data.totalPessoas} helper="Base sincronizada de clientes e partes." />
            <StatCard label="Processos" value={data.totalProcessos} helper="Portfólio total da operação." />
          </section>

          <div className="content-grid admin-grid">
            <SectionCard title="Usuários ativos" description="Acesso restrito ao administrador.">
              <div className="table-list">
                {data.usuarios.map((usuario) => (
                  <div className="list-row" key={usuario.id}>
                    <div>
                      <strong>{usuario.username}</strong>
                      <p>{usuario.pessoa.nome}</p>
                    </div>
                    <div>
                      <StatusBadge value={usuario.perfil} />
                      <span>{usuario.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Pessoas recentes" description="Clientes e contrapartes registrados.">
              <div className="table-list">
                {data.pessoas.map((pessoa) => (
                  <div className="list-row" key={pessoa.id}>
                    <div>
                      <strong>{pessoa.nome}</strong>
                      <p>{pessoa.email}</p>
                    </div>
                    <div>
                      <StatusBadge value={pessoa.tipoPessoa} />
                      <span>{formatDate(pessoa.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Processos monitorados" description="Resumo com navegação para preview.">
              <div className="table-list">
                {data.processos.map((processo) => (
                  <Link className="list-row interactive-row" key={processo.id} to={`/preview/${processo.id}`}>
                    <div>
                      <strong>{processo.numeroProcesso}</strong>
                      <p>{processo.descricao}</p>
                    </div>
                    <div>
                      <StatusBadge value={processo.status} />
                      <span>{processo.advogado.nome}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Últimas movimentações" description="Eventos recentes para acompanhamento gerencial.">
              <div className="timeline">
                {data.movimentacoes.map((movimentacao) => (
                  <article className="timeline-item" key={movimentacao.id}>
                    <strong>{movimentacao.processo.numeroProcesso}</strong>
                    <p>{movimentacao.descricao}</p>
                    <span>{formatDateTime(movimentacao.dataMovimentacao)}</span>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
