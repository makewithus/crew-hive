/**
 * components/DatePicker.js
 * Theme-matching, zero-emoji, accessible date picker component.
 * Replaces native unstyled browser date picker with CrewHive's dark-gold theme.
 */

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({
  value = "", // "YYYY-MM-DD"
  onChange,
  placeholder = "Select date",
  className = "",
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current value or default to today
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [value]);

  // Calendar view navigation state
  const [viewDate, setViewDate] = useState(() => {
    return selectedDate || new Date();
  });

  // Sync viewDate when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  // Close on outside click or Escape
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Navigation handlers
  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  // Days matrix generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete grid (up to 42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const handleSelectDay = (cell) => {
    const mm = String(cell.month + 1).padStart(2, "0");
    const dd = String(cell.day).padStart(2, "0");
    const dateStr = `${cell.year}-${mm}-${dd}`;
    if (onChange) {
      onChange(dateStr);
    }
    setIsOpen(false);
  };

  const handleSelectToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    if (onChange) {
      onChange(dateStr);
    }
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange("");
    }
    setIsOpen(false);
  };

  // Format display text (e.g. "12 Nov 2026")
  const displayText = useMemo(() => {
    if (!selectedDate) return "";
    return selectedDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDate]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-[#1A1A1A] border border-[#2A2A2A] text-foreground rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors ${
          isOpen ? "border-primary ring-1 ring-primary" : ""
        } ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          {displayText ? (
            <span className="font-semibold text-foreground text-sm">{displayText}</span>
          ) : (
            <span className="text-sm text-muted-foreground/60">{placeholder}</span>
          )}
        </div>
        {value && (
          <span
            onClick={handleClear}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-[#2A2A2A] transition-colors"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 bg-[#161616] border border-[#2E2E2E] rounded-2xl p-4 shadow-2xl w-72 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100 select-none">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#2A2A2A]">
            <span className="text-sm font-bold text-foreground">
              {MONTHS[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#242424] transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#242424] transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_SHORT.map((d) => (
              <span key={d} className="text-[11px] font-semibold text-muted-foreground/70 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cell, idx) => {
              const mm = String(cell.month + 1).padStart(2, "0");
              const dd = String(cell.day).padStart(2, "0");
              const cellStr = `${cell.year}-${mm}-${dd}`;
              const isSelected = value === cellStr;
              const isToday = todayStr === cellStr;

              return (
                <button
                  key={`${cellStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(cell)}
                  className={`w-8 h-8 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-black font-bold shadow-md shadow-primary/20"
                      : isToday
                      ? "border border-primary/50 text-primary font-bold hover:bg-[#222222]"
                      : cell.isCurrentMonth
                      ? "text-foreground hover:bg-[#242424]"
                      : "text-muted-foreground/30 hover:bg-[#1E1E1E]"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#2A2A2A] text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground py-1 px-2 rounded-lg hover:bg-[#242424] transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-primary font-semibold py-1 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

