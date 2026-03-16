import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import Header from "@/components/Header";
import EuropeMap from "@/components/EuropeMap";
import CountryFilter from "@/components/CountryFilter";
import NewsGrid from "@/components/NewsGrid";
import StatsPanel from "@/components/StatsPanel";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : "/api";

export default function Dashboard() {
  const [stories, setStories] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(900);
  const [showImages, setShowImages] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const timerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const fetchIdRef = useRef(0);

  // Apply theme class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const fetchStories = useCallback(async ({ clearFirst = false } = {}) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Increment fetch ID so stale responses are ignored
    const currentFetchId = ++fetchIdRef.current;

    // Clear stories immediately on filter changes so stale cards don't persist.
    // Skip clearing on auto-refresh to avoid a flash of empty state.
    if (clearFirst) {
      setStories([]);
    }

    try {
      const params = {};
      if (selectedCountry !== "all") params.country = selectedCountry;
      if (selectedPriority !== "all") params.priority = selectedPriority;
      params.limit = 200;

      const statsParams = {};
      if (selectedCountry !== "all") statsParams.country = selectedCountry;
      if (selectedPriority !== "all") statsParams.priority = selectedPriority;

      const [newsResp, statsResp] = await Promise.all([
        axios.get(`${API}/news`, { params, signal: controller.signal }),
        axios.get(`${API}/news/stats`, { params: statsParams, signal: controller.signal }),
      ]);

      // Only apply results if this is still the latest fetch
      if (currentFetchId !== fetchIdRef.current) return;

      setStories(newsResp.data.stories || []);
      setStats(statsResp.data);
      setLastUpdated(statsResp.data.last_updated);
      setLoading(false);
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      console.error("Failed to fetch news:", err);
      setLoading(false);
    }
  }, [selectedCountry, selectedPriority]);

  // Re-fetch and clear stale stories whenever filters change
  useEffect(() => {
    fetchStories({ clearFirst: true });
  }, [fetchStories]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Reset priority filter to "All" whenever the country changes
  const handleSelectCountry = useCallback((country) => {
    setSelectedPriority("all");
    setSelectedCountry(country);
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchStories();
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchStories]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div data-testid="news-dashboard" className="min-h-screen">
      <Header
        lastUpdated={lastUpdated}
        secondsUntilRefresh={secondsUntilRefresh}
        totalStories={stats?.total_stories || 0}
        showImages={showImages}
        onToggleImages={setShowImages}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pb-16">
        <EuropeMap
          countryDistribution={stats?.country_distribution || []}
          selectedCountry={selectedCountry}
          onSelectCountry={handleSelectCountry}
        />

        <CountryFilter
          selectedCountry={selectedCountry}
          onSelectCountry={handleSelectCountry}
          countryDistribution={stats?.country_distribution || []}
        />

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-medium tracking-tight">
                  {selectedCountry === "all" ? "All Stories" : selectedCountry}
                </h2>
                <span data-testid="story-count" className="font-mono text-sm text-muted-foreground">
                  {stories.length} stories
                </span>
              </div>
              <PriorityFilter selected={selectedPriority} onChange={setSelectedPriority} />
            </div>
            <NewsGrid stories={stories} showImages={showImages} />
          </div>

          <aside className="w-full lg:w-80 shrink-0">
            <StatsPanel stats={stats} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function PriorityFilter({ selected, onChange }) {
  const options = [
    { value: "all", label: "All" },
    { value: "church", label: "Church" },
    { value: "politics", label: "Politics" },
    { value: "disaster", label: "Disasters" },
    { value: "general", label: "General" },
  ];

  return (
    <div data-testid="priority-filter" className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          data-testid={`priority-${opt.value}`}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors duration-200 ${
            selected === opt.value
              ? opt.value === "politics"
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : opt.value === "disaster"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : opt.value === "church"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
