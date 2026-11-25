/**
 * apps/mobile/src/components/common/DatePickerModal.js
 * Theme-matching, responsive dark-gold calendar date picker for mobile.
 * Replaces plain text inputs with an interactive, accessible calendar dialog.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import Svg, { Path, Rect, Line, Circle } from "react-native-svg";
import { Colors, Radius, Typography } from "../../constants/theme.js";

// Calendar SVG Vector Icon
function CalendarIcon({ size = 18, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
      <Circle cx="8" cy="14" r="1" fill={color} />
      <Circle cx="12" cy="14" r="1" fill={color} />
      <Circle cx="16" cy="14" r="1" fill={color} />
      <Circle cx="8" cy="18" r="1" fill={color} />
      <Circle cx="12" cy="18" r="1" fill={color} />
    </Svg>
  );
}

function ChevronLeftIcon({ size = 20, color = Colors.text.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ size = 20, color = Colors.text.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_ML = [
  "ജനുവരി", "ഫെബ്രുവരി", "മാർച്ച്", "ഏപ്രിൽ", "മേയ്", "ജൂൺ",
  "ജൂലൈ", "ഓഗസ്റ്റ്", "സെപ്റ്റംബർ", "ഒക്ടോബർ", "നവംബർ", "ഡിസംബർ",
];

const DAYS_SHORT_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAYS_SHORT_ML = ["ഞാ", "തി", "ചൊ", "ബു", "വ്യാ", "വെ", "ശ"];

/**
 * Format date object into "DD/MM/YYYY" string
 */
export function formatDateDDMMYYYY(date) {
  if (!date || isNaN(date.getTime())) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Parse "DD/MM/YYYY" or "YYYY-MM-DD" into Date object
 */
export function parseDateString(str) {
  if (!str) return null;
  const parts = str.trim().split(/[/.-]/);
  if (parts.length !== 3) return null;

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  } else {
    // DD/MM/YYYY
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
}

export default function DatePickerModal({
  label,
  value, // "DD/MM/YYYY" or "YYYY-MM-DD"
  onChange,
  placeholder = "DD/MM/YYYY",
  disablePast = true,
  isMl = false,
  error,
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedDate = useMemo(() => parseDateString(value), [value]);

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  // Calendar view navigation (Year / Month)
  const [viewYear, setViewYear] = useState(() => (selectedDate || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selectedDate || today).getMonth());

  const openModal = () => {
    const initial = selectedDate || today;
    setViewYear(initial.getFullYear());
    setViewMonth(initial.getMonth());
    setModalVisible(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days matrix for the current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(viewYear, viewMonth, day);
      const isPast = disablePast && dateObj < today;
      const isToday =
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate();
      const isSelected =
        selectedDate &&
        dateObj.getFullYear() === selectedDate.getFullYear() &&
        dateObj.getMonth() === selectedDate.getMonth() &&
        dateObj.getDate() === selectedDate.getDate();

      days.push({
        day,
        dateObj,
        isPast,
        isToday,
        isSelected,
      });
    }
    return days;
  }, [viewYear, viewMonth, disablePast, today, selectedDate]);

  const handleSelectDay = (dayObj) => {
    if (!dayObj || dayObj.isPast) return;
    const formatted = formatDateDDMMYYYY(dayObj.dateObj);
    if (onChange) onChange(formatted);
    setModalVisible(false);
  };

  const handleSelectToday = () => {
    const formatted = formatDateDDMMYYYY(today);
    if (onChange) onChange(formatted);
    setModalVisible(false);
  };

  const handleClear = () => {
    if (onChange) onChange("");
    setModalVisible(false);
  };

  const months = isMl ? MONTHS_ML : MONTHS_EN;
  const daysShort = isMl ? DAYS_SHORT_ML : DAYS_SHORT_EN;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Input Field Trigger */}
      <TouchableOpacity
        style={[styles.inputBox, error ? styles.inputBoxError : null]}
        activeOpacity={0.75}
        onPress={openModal}
      >
        <Text style={[styles.inputText, !value ? styles.placeholderText : null]}>
          {value || placeholder}
        </Text>
        <CalendarIcon size={18} color={Colors.accent.amber} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Themed Modal Dialog */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.calendarCard}>
                {/* Month & Year Navigation Header */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={handlePrevMonth}
                    activeOpacity={0.7}
                  >
                    <ChevronLeftIcon size={20} color={Colors.text.primary} />
                  </TouchableOpacity>

                  <Text style={styles.monthYearTitle}>
                    {months[viewMonth]} {viewYear}
                  </Text>

                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={handleNextMonth}
                    activeOpacity={0.7}
                  >
                    <ChevronRightIcon size={20} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Names Header */}
                <View style={styles.weekdaysRow}>
                  {daysShort.map((d, idx) => (
                    <Text key={idx} style={styles.weekdayText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((item, index) => {
                    if (!item) {
                      return <View key={`empty_${index}`} style={styles.dayCell} />;
                    }

                    return (
                      <TouchableOpacity
                        key={`day_${item.day}`}
                        style={[
                          styles.dayCell,
                          item.isSelected && styles.dayCellSelected,
                          item.isToday && !item.isSelected && styles.dayCellToday,
                        ]}
                        disabled={item.isPast}
                        onPress={() => handleSelectDay(item)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            item.isPast && styles.dayTextDisabled,
                            item.isSelected && styles.dayTextSelected,
                            item.isToday && !item.isSelected && styles.dayTextToday,
                          ]}
                        >
                          {item.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Action Buttons Footer */}
                <View style={styles.calendarFooter}>
                  <TouchableOpacity
                    style={styles.footerButton}
                    onPress={handleClear}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.footerButtonTextMuted}>
                      {isMl ? "മായ്ക്കുക" : "Clear"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.footerRightButtons}>
                    <TouchableOpacity
                      style={styles.todayButton}
                      onPress={handleSelectToday}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.todayButtonText}>
                        {isMl ? "ഇന്ന്" : "Today"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => setModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.doneButtonText}>
                        {isMl ? "ശരി" : "Done"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  inputBox: {
    height: 48,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputBoxError: {
    borderColor: Colors.semantic.error,
  },
  inputText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.muted,
  },
  errorText: {
    fontSize: Typography.size.xs,
    color: Colors.semantic.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#161616",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  monthYearTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.2,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: 12,
    fontWeight: Typography.weight.semiBold,
    color: Colors.accent.amber,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 3,
    borderRadius: Radius.full,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.accent.amber,
  },
  dayCellSelected: {
    backgroundColor: Colors.accent.amber,
  },
  dayText: {
    fontSize: 14,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  dayTextDisabled: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  dayTextToday: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  dayTextSelected: {
    color: "#000000",
    fontWeight: Typography.weight.bold,
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  footerRightButtons: {
    flexDirection: "row",
    gap: 8,
  },
  footerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerButtonTextMuted: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontWeight: Typography.weight.medium,
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.25)",
  },
  todayButtonText: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent.amber,
  },
  doneButtonText: {
    fontSize: Typography.size.xs,
    color: "#000000",
    fontWeight: Typography.weight.bold,
  },
});

