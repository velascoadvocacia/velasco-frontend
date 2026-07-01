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
  usuarioAtivo: boolean;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

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
  usuarioAtivo: true
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isValidCpf(value: string) {
  const cpf = digitsOnly(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (size: number) => {
    const sum = cpf
      .slice(0, size)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (size + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validate(values: FormState) {
  const errors: FormErrors = {};

  if (!values.nome.trim()) {
    errors.nome = "Informe o nome da pessoa.";
  }

  if (!isValidCpf(values.cpf)) {
    errors.cpf = "Informe um CPF válido com 11 dígitos.";
  }

  if (!isValidEmail(values.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (!values.username.trim()) {
    errors.username = "Informe o username do usuário.";
  }

  if (!values.senha) {
    errors.senha = "Informe a senha.";
  }

  if (!values.confirmarSenha) {
    errors.confirmarSenha = "Confirme a senha.";
  } else if (values.confirmarSenha !== values.senha) {
    errors.confirmarSenha = "As senhas informadas não conferem.";
  }

  if (!values.perfil) {
    errors.perfil = "Selecione o perfil do usuário.";
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
    setErrors((current) => ({ ...current, [field]: undefined }));
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
              <input
                className={errors.nome ? "invalid-field" : ""}
                value={values.nome}
                onChange={(event) => handleChange("nome", event.target.value)}
                aria-invalid={Boolean(errors.nome)}
              />
              {errors.nome ? <span className="field-error">{errors.nome}</span> : null}
            </label>

            <label>
              CPF
              <input
                className={errors.cpf ? "invalid-field" : ""}
                value={values.cpf}
                onChange={(event) => handleChange("cpf", event.target.value)}
                aria-invalid={Boolean(errors.cpf)}
              />
              {errors.cpf ? <span className="field-error">{errors.cpf}</span> : null}
            </label>

            <label>
              Email
              <input
                className={errors.email ? "invalid-field" : ""}
                type="email"
                value={values.email}
                onChange={(event) => handleChange("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <span className="field-error">{errors.email}</span> : null}
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
              <input
                className={errors.username ? "invalid-field" : ""}
                value={values.username}
                onChange={(event) => handleChange("username", event.target.value)}
                aria-invalid={Boolean(errors.username)}
              />
              {errors.username ? <span className="field-error">{errors.username}</span> : null}
            </label>

            <label>
              Perfil
              <select
                className={errors.perfil ? "invalid-field" : ""}
                value={values.perfil}
                onChange={(event) => handleChange("perfil", event.target.value as PerfilUsuario | "")}
                aria-invalid={Boolean(errors.perfil)}
              >
                <option value="">Selecione</option>
                <option value="ADMIN">Admin</option>
                <option value="ADVOGADO">Advogado</option>
                <option value="ASSISTENTE">Assistente</option>
              </select>
              {errors.perfil ? <span className="field-error">{errors.perfil}</span> : null}
            </label>

            <label>
              Senha
              <input
                className={errors.senha ? "invalid-field" : ""}
                type="password"
                value={values.senha}
                onChange={(event) => handleChange("senha", event.target.value)}
                aria-invalid={Boolean(errors.senha)}
              />
              {errors.senha ? <span className="field-error">{errors.senha}</span> : null}
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
