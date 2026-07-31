import { FormEvent, useState } from "react";
import { SectionCard } from "./SectionCard";
import { api, ApiError } from "../lib/api";
import type { PessoaCreatePayload, TipoPessoa } from "../types/api";

type EstadoCivil =
  | "SOLTEIRO"
  | "CASADO"
  | "DIVORCIADO"
  | "VIUVO"
  | "UNIAO_ESTAVEL"
  | "SEPARADO";

interface PartyFormState {
  nome: string;
  email: string;
  telefone: string;
  nacionalidade: string;
  estadoCivil: EstadoCivil | "";
  rg: string;
  orgaoEmissorRg: string;
  pis: string;
  nomeMae: string;
  profissao: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  documento: string;
  dataNascimento: string;
  observacoes: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

interface PartyFormProps {
  token: string;
  roleLabel: string;
  tipoPessoa: TipoPessoa;
  hideNomeForJuridica?: boolean;
  title: string;
  description: string;
  successMessage: string;
}

const initialState: PartyFormState = {
  nome: "",
  email: "",
  telefone: "",
  nacionalidade: "",
  estadoCivil: "",
  rg: "",
  orgaoEmissorRg: "",
  pis: "",
  nomeMae: "",
  profissao: "",
  razaoSocial: "",
  nomeFantasia: "",
  inscricaoEstadual: "",
  documento: "",
  dataNascimento: "",
  observacoes: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: ""
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function payloadFromState(values: PartyFormState, tipoPessoa: TipoPessoa): PessoaCreatePayload {
  return {
    nome: values.nome.trim() || values.razaoSocial.trim() || values.nomeFantasia.trim(),
    email: values.email.trim(),
    telefone: optional(values.telefone),
    nacionalidade: optional(values.nacionalidade),
    estadoCivil: tipoPessoa === "FISICA" ? values.estadoCivil || null : null,
    rg: tipoPessoa === "FISICA" ? optional(values.rg) : null,
    orgaoEmissorRg: tipoPessoa === "FISICA" ? optional(values.orgaoEmissorRg) : null,
    pis: tipoPessoa === "FISICA" ? optional(values.pis) : null,
    nomeMae: tipoPessoa === "FISICA" ? optional(values.nomeMae) : null,
    profissao: tipoPessoa === "FISICA" ? optional(values.profissao) : null,
    razaoSocial: tipoPessoa === "JURIDICA" ? optional(values.razaoSocial || values.nome) : null,
    nomeFantasia: tipoPessoa === "JURIDICA" ? optional(values.nomeFantasia) : null,
    inscricaoEstadual: tipoPessoa === "JURIDICA" ? optional(values.inscricaoEstadual) : null,
    cpf: tipoPessoa === "FISICA" ? digitsOnly(values.documento) : null,
    cnpj: tipoPessoa === "JURIDICA" ? digitsOnly(values.documento) : null,
    tipoPessoa,
    dataNascimento: tipoPessoa === "FISICA" ? optional(values.dataNascimento) : null,
    endereco:
      optional(values.rua) ||
      optional(values.numero) ||
      optional(values.complemento) ||
      optional(values.bairro) ||
      optional(values.cidade) ||
      optional(values.estado) ||
      optional(values.cep)
        ? {
            rua: optional(values.rua) ?? undefined,
            numero: optional(values.numero) ?? undefined,
            complemento: optional(values.complemento) ?? undefined,
            bairro: optional(values.bairro) ?? undefined,
            cidade: optional(values.cidade) ?? undefined,
            estado: optional(values.estado)?.toUpperCase() ?? undefined,
            cep: digitsOnly(values.cep) || undefined
          }
        : null,
    observacoes: optional(values.observacoes),
    ativo: true
  };
}

export function PartyForm({
  token,
  roleLabel,
  tipoPessoa: initialTipoPessoa,
  hideNomeForJuridica = false,
  title,
  description,
  successMessage
}: PartyFormProps) {
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>(initialTipoPessoa);
  const [values, setValues] = useState<PartyFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(field: keyof PartyFormState, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleTipoPessoaChange(nextTipoPessoa: TipoPessoa) {
    setTipoPessoa(nextTipoPessoa);
    setValues((current) => ({
      ...current,
      documento: "",
      estadoCivil: "",
      rg: "",
      orgaoEmissorRg: "",
      pis: "",
      nomeMae: "",
      profissao: "",
      dataNascimento: "",
      razaoSocial: "",
      nomeFantasia: "",
      inscricaoEstadual: "",
      ...(nextTipoPessoa === "JURIDICA" && hideNomeForJuridica ? { nome: "" } : {})
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.createPessoa(token, payloadFromState(values, tipoPessoa));
      setValues(initialState);
      setSuccess(successMessage);
    } catch (submissionError) {
      setError(
        submissionError instanceof ApiError
          ? submissionError.message
          : `Falha ao cadastrar ${roleLabel.toLowerCase()}.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="party-form" onSubmit={handleSubmit}>
      <SectionCard title={title} description={description}>
        <div className="form-grid">
          {!(tipoPessoa === "JURIDICA" && hideNomeForJuridica) ? (
            <label>
              Nome
              <input value={values.nome} onChange={(event) => handleChange("nome", event.target.value)} />
            </label>
          ) : null}

          <label>
            E-mail
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
            {tipoPessoa === "FISICA" ? "CPF" : "CNPJ"}
            <input
              value={values.documento}
              onChange={(event) => handleChange("documento", event.target.value)}
            />
          </label>

          <label>
            Tipo de cadastro
            <select value={tipoPessoa} onChange={(event) => handleTipoPessoaChange(event.target.value as TipoPessoa)}>
              <option value="FISICA">Pessoa física</option>
              <option value="JURIDICA">Pessoa jurídica</option>
            </select>
          </label>

          <label>
            Nacionalidade
            <input
              value={values.nacionalidade}
              onChange={(event) => handleChange("nacionalidade", event.target.value)}
            />
          </label>

          {tipoPessoa === "FISICA" ? (
            <>
              <label>
                Data de nascimento
                <input
                  type="date"
                  value={values.dataNascimento}
                  onChange={(event) => handleChange("dataNascimento", event.target.value)}
                />
              </label>

              <label>
                Estado civil
                <select
                  value={values.estadoCivil}
                  onChange={(event) => handleChange("estadoCivil", event.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="SOLTEIRO">Solteiro</option>
                  <option value="CASADO">Casado</option>
                  <option value="DIVORCIADO">Divorciado</option>
                  <option value="VIUVO">Viúvo</option>
                  <option value="UNIAO_ESTAVEL">União estável</option>
                  <option value="SEPARADO">Separado</option>
                </select>
              </label>

              <label>
                RG
                <input value={values.rg} onChange={(event) => handleChange("rg", event.target.value)} />
              </label>

              <label>
                Órgão emissor do RG
                <input
                  value={values.orgaoEmissorRg}
                  onChange={(event) => handleChange("orgaoEmissorRg", event.target.value)}
                />
              </label>

              <label>
                PIS
                <input value={values.pis} onChange={(event) => handleChange("pis", event.target.value)} />
              </label>

              <label>
                Nome da mãe
                <input value={values.nomeMae} onChange={(event) => handleChange("nomeMae", event.target.value)} />
              </label>

              <label>
                Função
                <input
                  value={values.profissao}
                  onChange={(event) => handleChange("profissao", event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Razão social
                <input
                  value={values.razaoSocial}
                  onChange={(event) => handleChange("razaoSocial", event.target.value)}
                />
              </label>

              <label>
                Nome fantasia
                <input
                  value={values.nomeFantasia}
                  onChange={(event) => handleChange("nomeFantasia", event.target.value)}
                />
              </label>

              <label>
                Inscrição estadual
                <input
                  value={values.inscricaoEstadual}
                  onChange={(event) => handleChange("inscricaoEstadual", event.target.value)}
                />
              </label>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Endereço" description={`Endereço do ${roleLabel.toLowerCase()} para cadastro completo.`}>
        <div className="form-grid">
          <label>
            Rua
            <input value={values.rua} onChange={(event) => handleChange("rua", event.target.value)} />
          </label>

          <label>
            Número
            <input value={values.numero} onChange={(event) => handleChange("numero", event.target.value)} />
          </label>

          <label>
            Complemento
            <input
              value={values.complemento}
              onChange={(event) => handleChange("complemento", event.target.value)}
            />
          </label>

          <label>
            Bairro
            <input value={values.bairro} onChange={(event) => handleChange("bairro", event.target.value)} />
          </label>

          <label>
            Cidade
            <input value={values.cidade} onChange={(event) => handleChange("cidade", event.target.value)} />
          </label>

          <label>
            Estado
            <input value={values.estado} onChange={(event) => handleChange("estado", event.target.value)} />
          </label>

          <label>
            CEP
            <input value={values.cep} onChange={(event) => handleChange("cep", event.target.value)} />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Observações" description="Campo livre para observações adicionais do cadastro.">
        <label>
          Observações
          <textarea
            rows={5}
            value={values.observacoes}
            onChange={(event) => handleChange("observacoes", event.target.value)}
          />
        </label>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Salvando..." : `Salvar ${roleLabel.toLowerCase()}`}
        </button>
      </SectionCard>
    </form>
  );
}
