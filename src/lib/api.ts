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
  UsuarioCreatePayload,
  UsuarioUpdatePayload,
  RtPreviewRequest,
  RtPreviewResponse,
  ProcessoAnexoResponse
} from "../types/api";
import { API_BASE_URL } from "./constants";
import { getFilenameFromContentDisposition } from "./contentDisposition";

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
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

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

  updateUsuario: (token: string, usuarioId: number, payload: UsuarioUpdatePayload) =>
    request<Usuario>(`/usuarios/${usuarioId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),

  updatePessoa: (token: string, pessoaId: number, payload: PessoaCreatePayload) =>
    request<PessoaResponse>(`/pessoas/${pessoaId}`, {
      method: "PUT",
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

  previewRT: (token: string, payload: RtPreviewRequest) =>
    request<RtPreviewResponse>("/rt/preview", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),

  exportProcuracao: async (token: string, payload: { processoId?: number | null; reclamantesIds: number[]; reclamadasIds: number[]; advogadosIds: number[] }) => {
    const response = await fetch(`${API_BASE_URL}/rt/export-procuracao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new ApiError("Falha ao exportar a procuração.", response.status);
    const blob = await response.blob();
    const filename = getFilenameFromContentDisposition(response.headers.get("Content-Disposition"));
    return { blob, filename };
  },

  uploadProcessoAnexos: (
    token: string,
    processoId: number,
    files: File[],
    blocoId = "baixa_ctps_tutela",
    grupo = "geral"
  ) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("arquivos", file));
    formData.append("blocoId", blocoId);
    formData.append("grupo", grupo);
    return request<ProcessoAnexoResponse[]>(`/processos/${processoId}/anexos`, {
      method: "POST",
      token,
      body: formData
    });
  },

  deleteProcessoAnexo: (token: string, processoId: number, anexoId: number, blocoId = "baixa_ctps_tutela") =>
    request<void>(`/processos/${processoId}/anexos/${anexoId}?blocoId=${encodeURIComponent(blocoId)}`, {
      method: "DELETE",
      token
    }),

  getMovimentacoes: (token: string, page = 0, size = 20, processoId?: number) =>
    request<PageResponse<MovimentacaoResponse>>(
      `/movimentacoes${toQuery({ page, size, processoId })}`,
      { token }
    )
};
