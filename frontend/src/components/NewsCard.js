import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, Layers } from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

const SOURCE_COLORS = {
  AP: "bg-red-500/15 text-red-400 border-red-500/20",
  BBC: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Euronews: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

const PRIORITY_CONFIG = {
  politics: { label: "Politics", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  disaster: { label: "Disaster", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  general: { label: "General", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
};

export default function NewsCard({ story, featured, showImages = true }) {
  const priorityConfig = PRIORITY_CONFIG[story.priority] || PRIORITY_CONFIG.general;
  const sourceColor = SOURCE_COLORS[story.source] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  const hasImage = showImages && !!story.image_url;

  // Upgrade BBC thumbnail to higher resolution
  const imageUrl = story.image_url
    ? story.image_url.replace("/standard/240/", "/standard/624/")
    : "";

  return (
    <a
      href={story.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="news-card"
      style={{ animationDelay: `${(featured ? 0 : 0.03) * (Math.random() * 3)}s` }}
      className={`animate-fade-in-up group block rounded-sm border border-border bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 overflow-hidden ${
        featured ? "md:col-span-2" : ""
      } ${
        story.priority === "politics" ? "priority-politics" : ""
      } ${
        story.priority === "disaster" ? "priority-disaster" : ""
      }`}
    >
      {hasImage ? (
        <div className={`flex ${featured ? "flex-col" : "flex-row"} h-full`}>
          <div className={`relative overflow-hidden shrink-0 ${
            featured ? "w-full h-52" : "w-28 sm:w-36 min-h-full"
          }`}>
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              loading="lazy"
              onError={(e) => { e.target.parentElement.style.display = "none"; }}
            />
            {featured && (
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
            )}
          </div>

          <div className="p-4 flex flex-col flex-1 gap-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge data-testid={`source-badge-${story.source.toLowerCase()}`} className={`text-[10px] font-mono uppercase tracking-wider rounded-sm border ${sourceColor}`}>{story.source}</Badge>
              <Badge data-testid={`priority-badge-${story.priority}`} className={`text-[10px] font-mono uppercase tracking-wider rounded-sm border ${priorityConfig.color}`}>{priorityConfig.label}</Badge>
              {story.source_count > 1 && (
                <Badge data-testid="multi-source-badge" className="text-[10px] font-mono rounded-sm border bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                  <Layers className="w-2.5 h-2.5 mr-1" />{story.source_count} sources
                </Badge>
              )}
            </div>
            <h3 className="text-sm md:text-base font-semibold leading-snug text-foreground group-hover:text-foreground transition-colors line-clamp-3">{story.title}</h3>
            {story.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{story.description}</p>}
            <div className="mt-auto pt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground/60">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(story.published_at)}</span>
                <span data-testid="relevance-score" className="text-muted-foreground">rel: {story.relevance_score?.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                <ExternalLink className="w-3 h-3" /><span>Read</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="p-4 flex flex-col flex-1 gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge data-testid={`source-badge-${story.source.toLowerCase()}`} className={`text-[10px] font-mono uppercase tracking-wider rounded-sm border ${sourceColor}`}>{story.source}</Badge>
              <Badge data-testid={`priority-badge-${story.priority}`} className={`text-[10px] font-mono uppercase tracking-wider rounded-sm border ${priorityConfig.color}`}>{priorityConfig.label}</Badge>
              {story.source_count > 1 && (
                <Badge data-testid="multi-source-badge" className="text-[10px] font-mono rounded-sm border bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                  <Layers className="w-2.5 h-2.5 mr-1" />{story.source_count} sources
                </Badge>
              )}
            </div>
            <h3 className="text-sm md:text-base font-semibold leading-snug text-foreground group-hover:text-foreground transition-colors line-clamp-3">{story.title}</h3>
            {story.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{story.description}</p>}
            <div className="mt-auto pt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground/60">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(story.published_at)}</span>
                <span data-testid="relevance-score" className="text-muted-foreground">rel: {story.relevance_score?.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                <ExternalLink className="w-3 h-3" /><span>Read</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </a>
  );
}
