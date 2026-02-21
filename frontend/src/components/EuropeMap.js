import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { ChevronDown, ChevronUp, Map } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// ISO 3166-1 numeric codes for our target countries
const COUNTRY_CODES = {
  "United Kingdom": "826",
  "Ireland": "372",
  "Portugal": "620",
  "Iceland": "352",
  "Moldova": "498",
  "Latvia": "428",
  "Lithuania": "440",
  "Estonia": "233",
  "Finland": "246",
  "Norway": "578",
  "Sweden": "752",
  "Cape Verde": "132",
};

// Countries to show as grey background context
const CONTEXT_COUNTRIES = [
  "250", // France
  "276", // Germany
  "724", // Spain
  "380", // Italy
  "528", // Netherlands
  "056", // Belgium
  "616", // Poland
  "203", // Czech Republic
  "040", // Austria
  "756", // Switzerland
  "208", // Denmark
  "642", // Romania
  "100", // Bulgaria
  "300", // Greece
  "348", // Hungary
  "703", // Slovakia
  "191", // Croatia
  "804", // Ukraine
  "112", // Belarus
  "643", // Russia
  "688", // Serbia
  "070", // Bosnia
  "008", // Albania
  "807", // North Macedonia
  "499", // Montenegro
  "705", // Slovenia
];

const ALL_RELEVANT = new Set([
  ...Object.values(COUNTRY_CODES),
  ...CONTEXT_COUNTRIES,
]);

function getHeatColor(count, maxCount, isSelected) {
  if (isSelected) return "#22c55e"; // green-500
  if (count === 0) return "#991b1b"; // red-800
  const intensity = Math.min(count / maxCount, 1);
  // Interpolate from dark red (#991b1b) to bright red (#ef4444)
  const r = Math.round(153 + intensity * 86);
  const g = Math.round(27 + intensity * 41);
  const b = Math.round(27 + intensity * 41);
  return `rgb(${r}, ${g}, ${b})`;
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

  // Reverse lookup: code -> country name
  const codeToName = useMemo(() => {
    const map = {};
    Object.entries(COUNTRY_CODES).forEach(([name, code]) => {
      map[code] = name;
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
          style={{ maxHeight: 320 }}
        >
          <ComposableMap
            projection="geoAzimuthalEqualArea"
            projectionConfig={{
              center: [5, 56],
              rotate: [-10, -54, 0],
              scale: 650,
            }}
            width={900}
            height={300}
            style={{ width: "100%", height: "auto" }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryCode = geo.id;
                  const countryName = codeToName[countryCode];
                  const isTarget = !!countryName;
                  const isContext = CONTEXT_COUNTRIES.includes(countryCode);
                  const isSelected = selectedCountry === countryName;
                  const isHovered = hoveredCountry === countryCode;
                  const storyCount = countryName ? (countMap[countryName] || 0) : 0;

                  if (!isTarget && !isContext) return null;

                  if (!isTarget) {
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="hsl(var(--muted) / 0.6)"
                        stroke="hsl(var(--border))"
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
                    <TooltipProvider key={geo.rsmKey}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Geography
                            geography={geo}
                            fill={isHovered && !isSelected ? "#f59e0b" : fillColor}
                            stroke={isSelected ? "#22c55e" : isHovered ? "#f59e0b" : "rgba(255,255,255,0.2)"}
                            strokeWidth={isSelected || isHovered ? 1.5 : 0.5}
                            onClick={() => {
                              if (selectedCountry === countryName) {
                                onSelectCountry("all");
                              } else {
                                onSelectCountry(countryName);
                              }
                            }}
                            onMouseEnter={() => setHoveredCountry(countryCode)}
                            onMouseLeave={() => setHoveredCountry(null)}
                            style={{
                              default: { outline: "none", cursor: "pointer", transition: "fill 0.2s" },
                              hover: { outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{countryName}</p>
                          <p className="text-muted-foreground">{storyCount} stories</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })
              }
            </Geographies>
          </ComposableMap>

          {/* Legend */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border">
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "#7f1d1d" }} />
                <span>Fewer stories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }} />
                <span>More stories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "#22c55e" }} />
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
