import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import type { PerfilUsuario, Usuario } from "../types/api";

type EditState = {
  username: string;
  senha: string;
  pessoaId: string;
  perfil: PerfilUsuario;
  oab: string;
  tratamento: "DR." | "DRA." | "";
  ativo: boolean;
};

const emptyEdit: EditState = { username: "", senha: "", pessoaId: "", perfil: "ASSISTENTE", oab: "", tratamento: "", ativo: true };

export function UserManagementPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<Usuario[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState<EditState>(emptyEdit);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) return;
    void api.getUsuarios(session.token, 0, 300).then((response) => setItems(response.items)).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Falha ao carregar usuários.")).finally(() => setLoading(false));
  }, [session]);

  const filtered = useMemo(() => items.filter((item) => `${item.username} ${item.pessoa?.nome || ""} ${item.perfil}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  function startEdit(item: Usuario) {
    setEditing(item);
    setForm({ username: item.username, senha: "", pessoaId: String(item.pessoa?.id || ""), perfil: item.perfil, oab: item.oab || "", tratamento: item.tratamento || "", ativo: item.ativo });
    setMessage("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || !editing) return;
    setSaving(true); setError("");
    try {
      const payload = { username: form.username.trim(), pessoaId: Number(form.pessoaId), perfil: form.perfil, ...(form.senha.trim() ? { senha: form.senha } : {}), oab: form.perfil === "ADVOGADO" ? form.oab.trim() || null : null, tratamento: form.perfil === "ADVOGADO" ? form.tratamento || null : null, ativo: form.ativo };
      const updated = await api.updateUsuario(session.token, editing.id, payload);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null); setMessage("Usuário atualizado com sucesso.");
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Falha ao atualizar usuário.");
    } finally { setSaving(false); }
  }

  return <AppShell title="Gerenciar usuários" subtitle="Consulte e edite usuários cadastrados.">
    {error ? <div className="error-banner">{error}</div> : null}{message ? <div className="success-banner">{message}</div> : null}
    {editing ? <SectionCard title={`Editar ${editing.username}`} description="A senha é opcional e permanece inalterada quando deixada em branco.">
      <form className="party-form" onSubmit={submit}><div className="form-grid">
        <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
        <label>Pessoa vinculada<input value={form.pessoaId} onChange={(e) => setForm({ ...form, pessoaId: e.target.value })} /></label>
        <label>Perfil<select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilUsuario })}><option value="ADMIN">Admin</option><option value="ADVOGADO">Advogado</option><option value="ASSISTENTE">Assistente</option></select></label>
        {form.perfil === "ADVOGADO" ? <><label>Tratamento<select value={form.tratamento} onChange={(e) => setForm({ ...form, tratamento: e.target.value as EditState["tratamento"] })}><option value="">Selecione</option><option value="DR.">DR.</option><option value="DRA.">DRA.</option></select></label><label>OAB<input value={form.oab} onChange={(e) => setForm({ ...form, oab: e.target.value })} /></label></> : null}
        <label>Nova senha (opcional)<input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /><span>Ativo</span></label>
      </div><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button><button className="ghost-button" type="button" onClick={() => setEditing(null)}>Cancelar</button></form>
    </SectionCard> : null}
    <SectionCard title="Usuários cadastrados" description="Busque por username, nome ou perfil."><input className="table-search" placeholder="Buscar usuário" value={query} onChange={(e) => setQuery(e.target.value)} />{loading ? <div className="loading-panel">Carregando...</div> : <div className="table-list">{filtered.map((item) => <div className="list-row" key={item.id}><div><strong>{item.pessoa?.nome || item.username}</strong><p>{item.username} · {item.perfil}</p></div><div><StatusBadge value={item.ativo ? "ATIVO" : "INATIVO"} /><button className="inline-remove-button" type="button" onClick={() => startEdit(item)}>Editar</button></div></div>)}</div>}</SectionCard>
  </AppShell>;
}
