import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Globe, Shield, AlertTriangle, Newspaper } from "lucide-react";

const SOURCE_BAR_COLORS = {
  AP: "bg-red-500",
  BBC: "bg-amber-500",
  Euronews: "bg-cyan-500",
};

export default function StatsPanel({ stats }) {
  if (!stats) return null;

  const { source_distribution = [], country_distribution = [], priority_distribution = [], total_stories = 0 } = stats;
  const maxSourceCount = Math.max(...source_distribution.map((s) => s.count), 1);

  return (
    <div data-testid="stats-panel" className="space-y-6 sticky top-24">
      {/* Source Distribution */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold tracking-tight">Source Distribution</h3>
        </div>
        <div className="space-y-3">
          {source_distribution.map((src) => {
            const barColor = SOURCE_BAR_COLORS[src.source] || "bg-zinc-500";
            const pct = total_stories > 0 ? ((src.count / total_stories) * 100).toFixed(0) : 0;
            return (
              <div key={src.source} data-testid={`source-stat-${src.source.toLowerCase()}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-zinc-400">{src.source}</span>
                  <span className="text-[10px] font-mono text-zinc-600">{src.count} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${(src.count / maxSourceCount) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Priority Breakdown */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold tracking-tight">Priority Breakdown</h3>
        </div>
        <div className="space-y-2">
          {priority_distribution.map((p) => {
            const icon =
              p.priority === "politics" ? (
                <Globe className="w-3 h-3 text-orange-400" />
              ) : p.priority === "disaster" ? (
                <AlertTriangle className="w-3 h-3 text-blue-400" />
              ) : (
                <Newspaper className="w-3 h-3 text-zinc-500" />
              );

            return (
              <div key={p.priority} data-testid={`priority-stat-${p.priority}`} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-xs text-zinc-400 capitalize">{p.priority}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {p.count}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Top Countries */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold tracking-tight">Coverage by Country</h3>
        </div>
        <div className="space-y-1.5">
          {country_distribution.slice(0, 8).map((c) => (
            <div key={c.country} data-testid={`country-stat-${c.country?.toLowerCase().replace(/\s/g, "-")}`} className="flex items-center justify-between py-1">
              <span className="text-xs text-zinc-400">{c.country}</span>
              <span className="text-[10px] font-mono text-zinc-600">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
