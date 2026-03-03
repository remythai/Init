"use client";

interface FiltersSidebarProps {
  selectedTheme: string;
  setSelectedTheme: (v: string) => void;
  themes: { value: string; label: string }[];
  onlyAvailable: boolean;
  setOnlyAvailable: (v: boolean) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  dateFilters: { value: string; label: string }[];
  activeFilter: "all" | "registered";
  setActiveFilter: (v: "all" | "registered") => void;
  userType: "user" | "orga" | null;
  onReset: () => void;
}

export default function FiltersSidebar({
  selectedTheme,
  setSelectedTheme,
  themes,
  onlyAvailable,
  setOnlyAvailable,
  dateFilter,
  setDateFilter,
  dateFilters,
  activeFilter,
  setActiveFilter,
  userType,
  onReset,
}: FiltersSidebarProps) {
  const hasActiveFilters = selectedTheme !== "all" || onlyAvailable || dateFilter !== "all";

  return (
    <div className="flex items-center gap-x-6 gap-y-4">
      {/* All / Registered toggle */}
      {userType === "user" && (
        <div className="flex items-center gap-1.5">
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-[#303030] text-white shadow-sm"
                  : "text-[#303030] hover:bg-gray-200"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setActiveFilter("registered")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === "registered"
                  ? "bg-[#303030] text-white shadow-sm"
                  : "text-[#303030] hover:bg-gray-200"
              }`}
            >
              Mes events
            </button>
          </div>
        </div>
      )}

      {userType === "user" && <div className="w-px h-7 bg-gray-300" />}

      {/* Theme filter */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap gap-1">
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => setSelectedTheme(theme.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                selectedTheme === theme.value
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#303030] hover:bg-gray-200"
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-7 bg-gray-300" />

      {/* Date filter */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap gap-1">
          {dateFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                dateFilter === filter.value
                  ? "bg-[#303030] text-white"
                  : "bg-gray-100 text-[#303030] hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-7 bg-gray-300" />

      {/* Availability */}
      <button
        onClick={() => setOnlyAvailable(!onlyAvailable)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          onlyAvailable
            ? "bg-[#1271FF] text-white"
            : "bg-gray-100 text-[#303030] hover:bg-gray-200"
        }`}
      >
        Places dispo
      </button>

      {/* Reset */}
      {hasActiveFilters && (
        <>
          <div className="w-px h-7 bg-gray-300" />
          <button
            onClick={onReset}
            className="text-sm font-medium text-gray-400 hover:text-[#303030] transition-colors whitespace-nowrap"
          >
            Reinitialiser
          </button>
        </>
      )}
    </div>
  );
}
