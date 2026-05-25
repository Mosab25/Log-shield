interface AiRecommendationListProps {
  actions: string[];
}

export function AiRecommendationList({ actions }: AiRecommendationListProps) {
  if (!actions.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Recommended Actions</p>
      <ul className="space-y-1 text-sm text-slate-300">
        {actions.map((action) => (
          <li key={action} className="flex gap-2">
            <span className="text-cyan-300">•</span>
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
