import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import faviconVelasco from "../icons/cropped-velascofavicon.png";
import { useAuth } from "../context/AuthContext";
import { getInitials } from "../lib/format";

interface AppShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const { session, isAdmin, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <img src={faviconVelasco} alt="Velasco" />
          </span>
          <div>
            <strong>Velasco</strong>
            <p>Gestão jurídica integrada</p>
          </div>
        </Link>

        <div className="profile-card">
          <div className="avatar">{getInitials(session?.usuario.pessoa.nome || "Usuário")}</div>
          <div>
            <strong>{session?.usuario.pessoa.nome}</strong>
            <p>{session?.usuario.perfil}</p>
          </div>
        </div>

        <nav className="nav-links">
          <NavLink to="/dashboard">Dashboard Usuário</NavLink>
          <NavLink to="/rt">Reclamatórias</NavLink>
          <NavLink to="/rt/montar">Nova RT</NavLink>
          <NavLink to="/cadastros-partes/reclamante">Cadastrar Reclamante</NavLink>
          <NavLink to="/cadastros-partes/reclamada">Cadastrar Reclamada</NavLink>
          <NavLink to="/partes">Partes e Processos</NavLink>
          {isAdmin ? <NavLink to="/admin">Dashboard Admin</NavLink> : null}
        </nav>

        <button className="ghost-button" type="button" onClick={logout}>
          Encerrar sessão
        </button>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
