import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, Annotation } from "react-simple-maps";
import { ChevronDown, ChevronUp, Map } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// ISO 3166-1 numeric codes + approximate centroids for our target countries
const TARGET_COUNTRIES = {
  "United Kingdom": { code: "826", coords: [-2, 54] },
  "Ireland": { code: "372", coords: [-8, 53.5] },
  "Portugal": { code: "620", coords: [-8.5, 39.5] },
  "Iceland": { code: "352", coords: [-19, 65] },
  "Moldova": { code: "498", coords: [29, 47] },
  "Latvia": { code: "428", coords: [25, 57] },
  "Lithuania": { code: "440", coords: [24, 55.5] },
  "Estonia": { code: "233", coords: [25.5, 59] },
  "Finland": { code: "246", coords: [26, 64] },
  "Norway": { code: "578", coords: [10, 62] },
  "Sweden": { code: "752", coords: [16, 62] },
  "Cape Verde": { code: "132", coords: [-23.5, 15] },
};

const TARGET_CODES = new Set(Object.values(TARGET_COUNTRIES).map(c => c.code));

// Context countries (grey background)
const CONTEXT_CODES = new Set([
  "250", "276", "724", "380", "528", "056", "616", "203", "040", "756",
  "208", "642", "100", "300", "348", "703", "191", "804", "112", "643",
  "688", "070", "008", "807", "499", "705",
]);

function getHeatColor(count, maxCount, isSelected) {
  if (isSelected) return "#22c55e";
  if (count === 0) return "#ef4444"; // Bright red for zero
  const intensity = Math.min(count / maxCount, 1);
  // Gradient from bright red (#ef4444) to bright orange (#f97316) to yellow (#eab308)
  if (intensity < 0.5) {
    // Red to orange
    const t = intensity * 2;
    const r = Math.round(239 + (249 - 239) * t);
    const g = Math.round(68 + (115 - 68) * t);
    const b = Math.round(68 + (22 - 68) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Orange to yellow
    const t = (intensity - 0.5) * 2;
    const r = Math.round(249 + (234 - 249) * t);
    const g = Math.round(115 + (179 - 115) * t);
    const b = Math.round(22 + (8 - 22) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getMarkerRadius(count, maxCount) {
  if (count === 0) return 6;
  const intensity = Math.min(count / maxCount, 1);
  return 6 + intensity * 10; // 6px to 16px - larger for better visibility
}

// Short display names for map labels
const SHORT_NAMES = {
  "United Kingdom": "UK",
  "Ireland": "IRE",
  "Portugal": "PRT",
  "Iceland": "ISL",
  "Moldova": "MDA",
  "Latvia": "LVA",
  "Lithuania": "LTU",
  "Estonia": "EST",
  "Finland": "FIN",
  "Norway": "NOR",
  "Sweden": "SWE",
  "Cape Verde": "CPV",
};

export default function EuropeMap({ countryDistribution, selectedCountry, onSelectCountry }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredCountry, setHoveredCountry] = useState(null);

  const countMap = useMemo(() => {
    const map = {};
    (countryDistribution || []).forEach((c) => {
      map[c.country] = c.count;
    });
    return map;
  }, [countryDistribution]);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(countMap), 1);
  }, [countMap]);

  const codeToName = useMemo(() => {
    const map = {};
    Object.entries(TARGET_COUNTRIES).forEach(([name, data]) => {
      map[data.code] = name;
    });
    return map;
  }, []);

  return (
    <div data-testid="europe-map-section" className="mt-6">
      <button
        data-testid="map-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <Map className="w-4 h-4" />
        <span>Coverage Map</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div
          data-testid="europe-map"
          className="bg-slate-900/90 border border-slate-700 rounded-lg overflow-hidden transition-all duration-300"
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: [5, 54],
              scale: 450,
            }}
            width={900}
            height={420}
            style={{ width: "100%", height: "auto" }}
          >
            {/* Country shapes */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const id = geo.id;
                  const isTarget = TARGET_CODES.has(id);
                  const isContext = CONTEXT_CODES.has(id);
                  if (!isTarget && !isContext) return null;

                  const countryName = codeToName[id];
                  const isSelected = selectedCountry === countryName;
                  const isHovered = hoveredCountry === countryName;
                  const storyCount = countryName ? (countMap[countryName] || 0) : 0;

                  if (!isTarget) {
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#334155"
                        stroke="#475569"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  }

                  const fillColor = getHeatColor(storyCount, maxCount, isSelected);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isHovered && !isSelected ? "#f59e0b" : fillColor}
                      stroke={isSelected ? "#22c55e" : isHovered ? "#f59e0b" : "#ffffff"}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                      onClick={() => {
                        onSelectCountry(selectedCountry === countryName ? "all" : countryName);
                      }}
                      onMouseEnter={() => setHoveredCountry(countryName)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      style={{
                        default: { outline: "none", cursor: "pointer", transition: "fill 0.2s" },
                        hover: { outline: "none", cursor: "pointer" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Marker dots + labels on each target country */}
            {Object.entries(TARGET_COUNTRIES).map(([name, data]) => {
              const count = countMap[name] || 0;
              const isSelected = selectedCountry === name;
              const isHovered = hoveredCountry === name;
              const radius = getMarkerRadius(count, maxCount);
              const color = getHeatColor(count, maxCount, isSelected);

              // Skip Cape Verde on main map (off-screen)
              if (name === "Cape Verde") return null;

              return (
                <Marker
                  key={name}
                  coordinates={data.coords}
                  onClick={() => onSelectCountry(selectedCountry === name ? "all" : name)}
                  onMouseEnter={() => setHoveredCountry(name)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer glow ring */}
                  <circle
                    r={radius + 3}
                    fill="none"
                    stroke={isSelected ? "#22c55e" : isHovered ? "#f59e0b" : color}
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  {/* Main dot */}
                  <circle
                    r={radius}
                    fill={isHovered ? "#f59e0b" : color}
                    stroke={isSelected ? "#22c55e" : "#ffffff"}
                    strokeWidth={1.5}
                  />
                  {/* Story count inside circle */}
                  {count > 0 && (
                    <text
                      textAnchor="middle"
                      y={4}
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: radius > 10 ? "10px" : "8px",
                        fill: "#000",
                        fontWeight: "700",
                        pointerEvents: "none",
                      }}
                    >
                      {count}
                    </text>
                  )}
                  {/* Country label below */}
                  <text
                    textAnchor="middle"
                    y={radius + 16}
                    style={{
                      fontFamily: "system-ui, sans-serif",
                      fontSize: "10px",
                      fill: isSelected ? "#22c55e" : isHovered ? "#f59e0b" : "#e2e8f0",
                      fontWeight: "600",
                      pointerEvents: "none",
                    }}
                  >
                    {SHORT_NAMES[name]}
                  </text>
                </Marker>
              );
            })}

            {/* Cape Verde inset indicator (bottom-left) */}
            <Marker coordinates={[-23, 32]}>
              <line x1={0} y1={0} x2={0} y2={20} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} strokeDasharray="2,2" />
            </Marker>
            <Marker
              coordinates={[-23, 32]}
              onClick={() => onSelectCountry(selectedCountry === "Cape Verde" ? "all" : "Cape Verde")}
              onMouseEnter={() => setHoveredCountry("Cape Verde")}
              onMouseLeave={() => setHoveredCountry(null)}
              style={{ cursor: "pointer" }}
            >
              {(() => {
                const count = countMap["Cape Verde"] || 0;
                const isSelected = selectedCountry === "Cape Verde";
                const isHovered = hoveredCountry === "Cape Verde";
                const color = getHeatColor(count, maxCount, isSelected);
                const radius = getMarkerRadius(count, maxCount);
                return (
                  <>
                    <circle r={radius + 4} fill="none" stroke={isSelected ? "#22c55e" : color} strokeWidth={2} opacity={0.5} />
                    <circle r={radius} fill={isHovered ? "#f59e0b" : color} stroke={isSelected ? "#22c55e" : "#ffffff"} strokeWidth={2} />
                    <text textAnchor="middle" y={1} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", fill: "#000", fontWeight: "bold", pointerEvents: "none" }}>
                      {count > 0 ? count : ""}
                    </text>
                    <text textAnchor="middle" y={radius + 14} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fill: isSelected ? "#22c55e" : "#ffffff", fontWeight: "600", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                      CPV
                    </text>
                  </>
                );
              })()}
            </Marker>
          </ComposableMap>

          {/* Legend */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                <span>Fewer stories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#eab308" }} />
                <span>More stories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                <span>Selected</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Click a country to filter
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
