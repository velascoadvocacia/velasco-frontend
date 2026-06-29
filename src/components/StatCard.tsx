interface StatCardProps {
  label: string;
  value: string | number;
  helper: string;
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}
