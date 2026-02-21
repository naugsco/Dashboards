import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ChevronDown, ChevronUp, Map } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// ISO 3166-1 numeric codes for our target countries
const TARGET_COUNTRIES = {
  "United Kingdom": { code: "826" },
  "Ireland": { code: "372" },
  "Portugal": { code: "620" },
  "Iceland": { code: "352" },
  "Moldova": { code: "498" },
  "Latvia": { code: "428" },
  "Lithuania": { code: "440" },
  "Estonia": { code: "233" },
  "Finland": { code: "246" },
  "Norway": { code: "578" },
  "Sweden": { code: "752" },
  "Cape Verde": { code: "132" },
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
  if (count === 0) return "#ef4444";
  const intensity = Math.min(count / maxCount, 1);
  if (intensity < 0.5) {
    const t = intensity * 2;
    const r = Math.round(239 + (249 - 239) * t);
    const g = Math.round(68 + (115 - 68) * t);
    const b = Math.round(68 + (22 - 68) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (intensity - 0.5) * 2;
    const r = Math.round(249 + (234 - 249) * t);
    const g = Math.round(115 + (179 - 115) * t);
    const b = Math.round(22 + (8 - 22) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

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
              center: [15, 58],
              scale: 450,
              rotate: [-15, 0, 0],
            }}
            width={900}
            height={420}
            style={{ width: "100%", height: "auto" }}
          >
            {/* Country shapes */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const id = String(geo.id);
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
