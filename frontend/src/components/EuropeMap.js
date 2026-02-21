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
  if (count === 0) return "#b91c1c";
  const intensity = Math.min(count / maxCount, 1);
  const r = Math.round(185 + intensity * 70);
  const g = Math.round(28 + intensity * 23);
  const b = Math.round(28 + intensity * 23);
  return `rgb(${r}, ${g}, ${b})`;
}

function getMarkerRadius(count, maxCount) {
  if (count === 0) return 4;
  const intensity = Math.min(count / maxCount, 1);
  return 4 + intensity * 8; // 4px to 12px
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
          className="bg-card/40 border border-border rounded-sm overflow-hidden transition-all duration-300"
        >
          <ComposableMap
            projection="geoAzimuthalEqualArea"
            projectionConfig={{
              center: [5, 56],
              rotate: [-10, -54, 0],
              scale: 620,
            }}
            width={900}
            height={320}
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
                        fill="hsl(var(--muted) / 0.25)"
                        stroke="hsl(var(--border) / 0.3)"
                        strokeWidth={0.3}
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
                      stroke={isSelected ? "#22c55e" : isHovered ? "#f59e0b" : "rgba(255,255,255,0.3)"}
                      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.7}
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
                  {/* Glow ring */}
                  <circle
                    r={radius + 2}
                    fill="none"
                    stroke={isSelected ? "#22c55e" : isHovered ? "#f59e0b" : color}
                    strokeWidth={1}
                    opacity={0.4}
                  />
                  {/* Main dot */}
                  <circle
                    r={radius}
                    fill={isHovered ? "#f59e0b" : color}
                    stroke={isSelected ? "#22c55e" : "rgba(0,0,0,0.5)"}
                    strokeWidth={1}
                  />
                  {/* Story count */}
                  <text
                    textAnchor="middle"
                    y={1}
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: radius > 6 ? "7px" : "5px",
                      fill: "#fff",
                      fontWeight: "bold",
                      pointerEvents: "none",
                    }}
                  >
                    {count > 0 ? count : ""}
                  </text>
                  {/* Country label */}
                  <text
                    textAnchor="middle"
                    y={radius + 11}
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "7px",
                      fill: isSelected ? "#22c55e" : isHovered ? "#f59e0b" : "hsl(var(--muted-foreground))",
                      fontWeight: isSelected ? "bold" : "normal",
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
                    <circle r={radius + 2} fill="none" stroke={isSelected ? "#22c55e" : color} strokeWidth={1} opacity={0.4} />
                    <circle r={radius} fill={isHovered ? "#f59e0b" : color} stroke={isSelected ? "#22c55e" : "rgba(0,0,0,0.5)"} strokeWidth={1} />
                    <text textAnchor="middle" y={1} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "6px", fill: "#fff", fontWeight: "bold", pointerEvents: "none" }}>
                      {count > 0 ? count : ""}
                    </text>
                    <text textAnchor="middle" y={radius + 11} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "7px", fill: isSelected ? "#22c55e" : "hsl(var(--muted-foreground))", pointerEvents: "none" }}>
                      CPV
                    </text>
                  </>
                );
              })()}
            </Marker>
          </ComposableMap>

          {/* Legend */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border">
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#b91c1c" }} />
                <span>Fewer stories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ff3333" }} />
                <span>More stories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                <span>Selected</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              Click a country to filter
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
