export function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
      <p className="text-sm text-slate-400">Page {page} of {pages} · Total {total}</p>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm disabled:opacity-40">Previous</button>
        <button disabled={page >= pages} onClick={() => onPageChange(page + 1)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
