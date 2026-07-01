import type {
  AuthLoginResponse,
  MovimentacaoResponse,
  PageResponse,
  PessoaCreatePayload,
  PessoaResponse,
  ProcessoCreatePayload,
  ProcessoUpdatePayload,
  Processo,
  Usuario,
  UsuarioCreatePayload
} from "../types/api";
import { API_BASE_URL } from "./constants";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  }).catch((error: unknown) => {
    throw new ApiError(
      "Não foi possível alcançar a API no navegador. Verifique backend ativo e CORS/proxy de desenvolvimento.",
      0
    );
  });

  if (!response.ok) {
    let message = "Falha na comunicação com a API.";

    try {
      const body = (await response.json()) as { message?: string };
      message = body.message || message;
    } catch {
      if (response.status === 401) {
        message = "Sua sessão expirou ou não é válida.";
      }
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function toQuery(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      searchParams.set(key, `${value}`);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const api = {
  login: (username: string, senha: string) =>
    request<AuthLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, senha })
    }),

  getUsuarios: (token: string, page = 0, size = 12) =>
    request<PageResponse<Usuario>>(`/usuarios${toQuery({ page, size })}`, { token }),

  getPessoas: (token: string, page = 0, size = 12) =>
    request<PageResponse<PessoaResponse>>(`/pessoas${toQuery({ page, size })}`, { token }),

  createPessoa: (token: string, payload: PessoaCreatePayload) =>
    request<PessoaResponse>("/pessoas", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),

  createUsuario: (token: string, payload: UsuarioCreatePayload) =>
    request<Usuario>("/usuarios", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),

  getProcessos: (
    token: string,
    params: {
      page?: number;
      size?: number;
      numeroProcesso?: string;
      advogadoId?: number;
      clienteId?: number;
      status?: string;
    } = {}
  ) => request<PageResponse<Processo>>(`/processos${toQuery(params)}`, { token }),

  getProcessoById: (token: string, processoId: number) =>
    request<Processo>(`/processos/${processoId}`, { token }),

  createProcesso: (token: string, payload: ProcessoCreatePayload) =>
    request<Processo>("/processos", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),

  updateProcesso: (token: string, processoId: number, payload: ProcessoUpdatePayload) =>
    request<Processo>(`/processos/${processoId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),

  getMovimentacoes: (token: string, page = 0, size = 20, processoId?: number) =>
    request<PageResponse<MovimentacaoResponse>>(
      `/movimentacoes${toQuery({ page, size, processoId })}`,
      { token }
    )
};
