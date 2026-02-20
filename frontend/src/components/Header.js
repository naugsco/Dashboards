import { RefreshCw, Radio } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Header({ lastUpdated, secondsUntilRefresh, onRefresh, refreshing, totalStories, refreshKey }) {
  const minutes = Math.floor(secondsUntilRefresh / 60);
  const seconds = secondsUntilRefresh % 60;
  const progressValue = ((900 - secondsUntilRefresh) / 900) * 100;

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Never";
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <header data-testid="dashboard-header" className="border-b border-zinc-800/80 sticky top-0 z-50 bg-[#09090b]/95 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 text-red-500" />
              <h1 data-testid="app-title" className="text-2xl md:text-3xl font-bold tracking-tight leading-none">
                Pulse
              </h1>
            </div>
            <span className="hidden sm:inline-block text-xs font-mono text-zinc-600 border-l border-zinc-800 pl-4">
              European News Monitor
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span data-testid="total-stories">{totalStories} stories</span>
              <span className="text-zinc-700">|</span>
              <span data-testid="last-updated">Updated {formatLastUpdated()}</span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div data-testid="refresh-timer" className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                    <div className="w-20">
                      <Progress value={progressValue} className="h-1 bg-zinc-800" />
                    </div>
                    <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next auto-refresh in {minutes}m {seconds}s</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button
              data-testid="refresh-button"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-sm transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
