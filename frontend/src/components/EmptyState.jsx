export default function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
        ◍
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
