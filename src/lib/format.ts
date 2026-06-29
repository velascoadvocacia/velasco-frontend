export function formatDate(date?: string | null) {
  if (!date) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(new Date(date));
}

export function formatDateTime(date?: string | null) {
  if (!date) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(date));
}

export function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
