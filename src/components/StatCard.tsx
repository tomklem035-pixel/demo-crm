export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
