import { formatStatus } from "../lib/format";

interface StatusBadgeProps {
  value: string;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const slug = value.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  return <span className={`status-badge status-${slug}`}>{formatStatus(value)}</span>;
}
