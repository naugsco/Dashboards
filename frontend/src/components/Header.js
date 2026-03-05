import { Radio, Image, Sun, Moon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

export default function Header({ lastUpdated, secondsUntilRefresh, totalStories, showImages, onToggleImages, darkMode, onToggleDarkMode }) {
  const minutes = Math.floor(secondsUntilRefresh / 60);
  const seconds = secondsUntilRefresh % 60;
  const progressValue = ((900 - secondsUntilRefresh) / 900) * 100;

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Never";
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <header data-testid="dashboard-header" className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 text-red-500" />
              <h1 data-testid="app-title" className="text-2xl md:text-3xl font-bold tracking-tight leading-none">
                Pulse
              </h1>
            </div>
            <span className="hidden sm:inline-block text-xs font-mono text-muted-foreground border-l border-border pl-4">
              European News Monitor
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span data-testid="total-stories">{totalStories} stories</span>
              <span className="opacity-40">|</span>
              <span data-testid="last-updated">Updated {formatLastUpdated()}</span>
            </div>

            <div className="hidden sm:flex items-center gap-4 border-l border-border pl-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div data-testid="toggle-images" className="flex items-center gap-2">
                      <Image className="w-3.5 h-3.5 text-muted-foreground" />
                      <Switch
                        checked={showImages}
                        onCheckedChange={onToggleImages}
                        aria-label="Toggle images"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>{showImages ? "Hide" : "Show"} thumbnails</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div data-testid="toggle-theme" className="flex items-center gap-2">
                      {darkMode ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
                      <Switch
                        checked={!darkMode}
                        onCheckedChange={() => onToggleDarkMode()}
                        aria-label="Toggle theme"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>{darkMode ? "Switch to light" : "Switch to dark"} theme</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div data-testid="refresh-timer" className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <div className="w-20">
                      <Progress value={progressValue} className="h-1" />
                    </div>
                    <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next auto-refresh in {minutes}m {seconds}s</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </div>
        </div>
      </div>
    </header>
  );
}
