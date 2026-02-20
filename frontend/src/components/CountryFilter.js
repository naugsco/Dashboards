import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const COUNTRIES = [
  "United Kingdom", "Ireland", "Portugal", "Iceland", "Moldova",
  "Latvia", "Lithuania", "Estonia", "Finland", "Norway", "Sweden", "Cape Verde"
];

const COUNTRY_FLAGS = {
  "United Kingdom": "GB",
  "Ireland": "IE",
  "Portugal": "PT",
  "Iceland": "IS",
  "Moldova": "MD",
  "Latvia": "LV",
  "Lithuania": "LT",
  "Estonia": "EE",
  "Finland": "FI",
  "Norway": "NO",
  "Sweden": "SE",
  "Cape Verde": "CV",
};

function getFlagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt()));
}

export default function CountryFilter({ selectedCountry, onSelectCountry, countryDistribution }) {
  const countMap = {};
  (countryDistribution || []).forEach((c) => {
    countMap[c.country] = c.count;
  });

  const totalStories = Object.values(countMap).reduce((a, b) => a + b, 0);

  return (
    <div data-testid="country-filter" className="mt-8">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <button
            data-testid="country-all"
            onClick={() => onSelectCountry("all")}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-sm transition-all duration-200 ${
              selectedCountry === "all"
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            All
            <span className="font-mono text-xs opacity-60">{totalStories}</span>
          </button>

          {COUNTRIES.map((country) => {
            const code = COUNTRY_FLAGS[country];
            const count = countMap[country] || 0;
            const isActive = selectedCountry === country;

            return (
              <button
                key={country}
                data-testid={`country-${country.toLowerCase().replace(/\s/g, "-")}`}
                onClick={() => onSelectCountry(country)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-sm transition-all duration-200 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : count > 0
                    ? "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
                    : "bg-zinc-900/50 text-zinc-600 border border-zinc-800/50 cursor-default"
                }`}
              >
                <span className="text-base">{getFlagEmoji(code)}</span>
                <span className="hidden sm:inline">{country}</span>
                {count > 0 && (
                  <span className="font-mono text-xs opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
