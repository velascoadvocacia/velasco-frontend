import type { AuthLoginResponse, JwtPayload } from "../types/api";
import { AUTH_STORAGE_KEY } from "./constants";

export interface AuthSession extends AuthLoginResponse {
  claims: JwtPayload;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function decodeJwt(token: string): JwtPayload {
  const [, payload] = token.split(".");
  if (!payload) return {};

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return {};
  }
}

export function loadSession() {
  return parseJson<AuthSession>(window.localStorage.getItem(AUTH_STORAGE_KEY));
}

export function persistSession(response: AuthLoginResponse) {
  const session: AuthSession = {
    ...response,
    claims: decodeJwt(response.token)
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isSessionExpired(session: AuthSession | null) {
  if (!session?.claims.exp) return false;
  return session.claims.exp * 1000 <= Date.now();
}
