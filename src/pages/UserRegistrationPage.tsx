import { FormEvent, useState } from "react";
import { AppShell } from "../components/AppShell";
import { SectionCard } from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import type { PerfilUsuario, PessoaCreatePayload, TipoPessoa } from "../types/api";

interface FormState {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  tipoPessoa: TipoPessoa;
  dataNascimento: string;
  pessoaAtivo: boolean;
  username: string;
  senha: string;
  confirmarSenha: string;
  perfil: PerfilUsuario | "";
  tratamento: "DR" | "DRA" | "";
  oab: string;
  usuarioAtivo: boolean;
}

type FormErrors = Partial<Record<"confirmarSenha", string>>;

const initialState: FormState = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  tipoPessoa: "FISICA",
  dataNascimento: "",
  pessoaAtivo: true,
  username: "",
  senha: "",
  confirmarSenha: "",
  perfil: "",
  tratamento: "",
  oab: "",
  usuarioAtivo: true
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function validate(values: FormState) {
  const errors: FormErrors = {};

  if ((values.senha || values.confirmarSenha) && values.confirmarSenha !== values.senha) {
    errors.confirmarSenha = "As senhas informadas não conferem.";
  }

  return errors;
}

function pessoaPayloadFromState(values: FormState): PessoaCreatePayload {
  return {
    nome: values.nome.trim(),
    cpf: digitsOnly(values.cpf),
    email: values.email.trim(),
    telefone: optional(values.telefone),
    tipoPessoa: values.tipoPessoa,
    dataNascimento: optional(values.dataNascimento),
    ativo: values.pessoaAtivo
  };
}

export function UserRegistrationPage() {
  const { session } = useAuth();
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!session) return null;

  const token = session.token;

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setError("Revise os campos destacados antes de salvar.");
      return;
    }

    setLoading(true);
    let pessoaCriada = false;

    try {
      const pessoa = await api.createPessoa(token, pessoaPayloadFromState(values));
      pessoaCriada = true;

      await api.createUsuario(token, {
        username: values.username.trim(),
        senha: values.senha,
        pessoaId: pessoa.id,
        perfil: values.perfil as PerfilUsuario,
        tratamento: values.perfil === "ADVOGADO" ? values.tratamento || null : null,
        oab: values.perfil === "ADVOGADO" ? optional(values.oab) : null,
        ativo: values.usuarioAtivo
      });

      setValues(initialState);
      setErrors({});
      setSuccess("Usuário cadastrado com sucesso.");
    } catch (submissionError) {
      const message =
        submissionError instanceof ApiError
          ? submissionError.message
          : "Falha ao cadastrar usuário.";
      const friendlyMessage = pessoaCriada
        ? `A pessoa foi cadastrada, mas não foi possível concluir o cadastro do usuário. ${message}`
        : message;

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Cadastro de usuários"
      subtitle="Crie a pessoa vinculada e o acesso do usuário em um único fluxo."
    >
      <form className="party-form" onSubmit={handleSubmit} noValidate>
        <SectionCard title="Dados da pessoa" description="Informações cadastrais usadas para vincular o usuário.">
          <div className="form-grid">
            <label>
              Nome
              <input value={values.nome} onChange={(event) => handleChange("nome", event.target.value)} />
            </label>

            <label>
              CPF
              <input value={values.cpf} onChange={(event) => handleChange("cpf", event.target.value)} />
            </label>

            <label>
              Email
              <input
                value={values.email}
                onChange={(event) => handleChange("email", event.target.value)}
              />
            </label>

            <label>
              Telefone
              <input value={values.telefone} onChange={(event) => handleChange("telefone", event.target.value)} />
            </label>

            <label>
              Tipo de pessoa
              <select
                value={values.tipoPessoa}
                onChange={(event) => handleChange("tipoPessoa", event.target.value as TipoPessoa)}
              >
                <option value="FISICA">Pessoa física</option>
                <option value="JURIDICA">Pessoa jurídica</option>
              </select>
            </label>

            <label>
              Data de nascimento
              <input
                type="date"
                value={values.dataNascimento}
                onChange={(event) => handleChange("dataNascimento", event.target.value)}
              />
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={values.pessoaAtivo}
                onChange={(event) => handleChange("pessoaAtivo", event.target.checked)}
              />
              <span>Ativo</span>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Dados do usuário" description="Credenciais e perfil de acesso vinculados à pessoa.">
          <div className="form-grid">
            <label>
              Username
              <input value={values.username} onChange={(event) => handleChange("username", event.target.value)} />
            </label>

            <label>
              Perfil
              <select
                value={values.perfil}
                onChange={(event) => handleChange("perfil", event.target.value as PerfilUsuario | "")}
              >
                <option value="">Selecione</option>
                <option value="ADMIN">Admin</option>
                <option value="ADVOGADO">Advogado</option>
                <option value="ASSISTENTE">Assistente</option>
              </select>
            </label>

            {values.perfil === "ADVOGADO" ? (
              <>
                <label>
                  Tratamento
                  <select
                    value={values.tratamento}
                    onChange={(event) => handleChange("tratamento", event.target.value as FormState["tratamento"])}
                  >
                    <option value="">Selecione</option>
                    <option value="DR">DR.</option>
                    <option value="DRA">DRA.</option>
                  </select>
                </label>

                <label>
                  OAB (opcional)
                  <input value={values.oab} onChange={(event) => handleChange("oab", event.target.value)} />
                </label>
              </>
            ) : null}

            <label>
              Senha
              <input type="password" value={values.senha} onChange={(event) => handleChange("senha", event.target.value)} />
            </label>

            <label>
              Confirmar senha
              <input
                className={errors.confirmarSenha ? "invalid-field" : ""}
                type="password"
                value={values.confirmarSenha}
                onChange={(event) => handleChange("confirmarSenha", event.target.value)}
                aria-invalid={Boolean(errors.confirmarSenha)}
              />
              {errors.confirmarSenha ? <span className="field-error">{errors.confirmarSenha}</span> : null}
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={values.usuarioAtivo}
                onChange={(event) => handleChange("usuarioAtivo", event.target.checked)}
              />
              <span>Ativo</span>
            </label>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {success ? <div className="success-banner">{success}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar usuário"}
          </button>
        </SectionCard>
      </form>
    </AppShell>
  );
}
