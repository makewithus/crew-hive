/**
 * components/CountryCodeSelect.js
 * Professional, zero-emoji, searchable country code selector.
 * Full global coverage (219+ countries) with popular quick-picks, dark-theme styling,
 * keyboard accessibility, and custom scrollbar.
 */

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { COUNTRIES, getCountryByCode } from "@/utils/countries";
import { ChevronDown, Search, Check, X } from "lucide-react";

export default function CountryCodeSelect({
  value = "+91",
  onChange,
  onSelectCountry,
  disabled = false,
  className = "",
  id,
  name = "countryCode",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find currently selected country
  const selectedCountry = useMemo(() => {
    return getCountryByCode(value);
  }, [value]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filter countries based on query
  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return null; // When empty, render structured list (popular + all)

    return COUNTRIES.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const codeMatch = c.code.replace(/^\+/, "").includes(q);
      const isoMatch = c.iso.toLowerCase().includes(q);
      return nameMatch || codeMatch || isoMatch;
    });
  }, [search]);

  // Popular quick-picks
  const popularCountries = useMemo(() => {
    return COUNTRIES.filter((c) => c.popular);
  }, []);

  const handleSelect = (country) => {
    if (onChange) {
      onChange(country.code);
    }
    if (onSelectCountry) {
      onSelectCountry(country);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for standard form serialization */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full bg-[#1A1A1A] border border-[#2A2A2A] text-foreground rounded-xl px-3.5 py-3 text-sm flex items-center justify-between cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors ${
          isOpen ? "border-primary ring-1 ring-primary" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-foreground text-sm truncate">
            {selectedCountry.name}
          </span>
          <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md font-bold shrink-0">
            {selectedCountry.code}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161616] border border-[#2E2E2E] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Search Bar */}
          <div className="p-2.5 border-b border-[#2A2A2A] bg-[#1A1A1A]/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code (e.g. India, 91)..."
                className="w-full bg-[#121212] border border-[#2E2E2E] focus:border-primary rounded-lg pl-8 pr-7 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredCountries ? (
              // Search Results
              filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.code === value;
                  return (
                    <button
                      key={`${c.iso}-${c.code}`}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-primary/15 text-primary font-bold"
                          : "text-foreground hover:bg-[#222222]"
                      }`}
                    >
                      <span className="truncate mr-2 font-medium">{c.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-[11px] ${
                            isSelected
                              ? "text-primary font-bold"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {c.code}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No country found matching &ldquo;{search}&rdquo;
                </div>
              )
            ) : (
              // Standard View: Popular + All
              <>
                {/* Popular Header */}
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-[#1B1B1B]/60 rounded-md my-1">
                  Popular Hubs
                </div>
                {popularCountries.map((c) => {
                  const isSelected = c.code === value;
                  return (
                    <button
                      key={`pop-${c.iso}-${c.code}`}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-primary/15 text-primary font-bold"
                          : "text-foreground hover:bg-[#222222]"
                      }`}
                    >
                      <span className="truncate mr-2 font-medium">{c.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-[11px] ${
                            isSelected
                              ? "text-primary font-bold"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {c.code}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </button>
                  );
                })}

                {/* All Countries Header */}
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-[#1B1B1B]/60 rounded-md mt-2 mb-1">
                  All Countries ({COUNTRIES.length})
                </div>
                {COUNTRIES.map((c) => {
                  const isSelected = c.code === value;
                  return (
                    <button
                      key={`all-${c.iso}-${c.code}`}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-primary/15 text-primary font-bold"
                          : "text-foreground hover:bg-[#222222]"
                      }`}
                    >
                      <span className="truncate mr-2 font-medium">{c.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-[11px] ${
                            isSelected
                              ? "text-primary font-bold"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {c.code}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
