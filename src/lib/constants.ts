export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.DEV ? "/api" : "http://localhost:8080");

export const AUTH_STORAGE_KEY = "velasco.auth";
