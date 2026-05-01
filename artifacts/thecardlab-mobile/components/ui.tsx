import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

// Pill badge
type PillVariant = "teal" | "cyan" | "gold" | "red" | "violet" | "blue" | "muted";

const pillColors: Record<PillVariant, { bg: string; border: string; text: string }> = {
  teal:   { bg: "rgba(34,211,166,0.12)",  border: "rgba(34,211,166,0.4)",  text: "#b7fff0" },
  cyan:   { bg: "rgba(0,229,255,0.12)",   border: "rgba(0,229,255,0.4)",   text: "#bdf7ff" },
  gold:   { bg: "rgba(246,183,60,0.12)",  border: "rgba(246,183,60,0.4)",  text: "#ffe7b6" },
  red:    { bg: "rgba(255,77,97,0.12)",   border: "rgba(255,77,97,0.4)",   text: "#ffd7dd" },
  violet: { bg: "rgba(123,97,255,0.12)",  border: "rgba(123,97,255,0.4)",  text: "#e5ddff" },
  blue:   { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.4)",  text: "#d8e8ff" },
  muted:  { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", text: "#94a3b8" },
};

export function Pill({ label, variant = "teal" }: { label: string; variant?: PillVariant }) {
  const pc = pillColors[variant];
  return (
    <View style={[styles.pill, { backgroundColor: pc.bg, borderColor: pc.border }]}>
      <Text style={[styles.pillText, { color: pc.text }]}>{label}</Text>
    </View>
  );
}

// KPI Card
export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  const c = useColors();
  return (
    <View style={[styles.kpiCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.kpiLabel, { color: c.label }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.kpiValue, { color: accent ?? c.text }]}>{value}</Text>
      {sub ? <Text style={[styles.kpiSub, { color: c.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

// Section header
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionHeaderText, { color: c.label }]}>{title.toUpperCase()}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: c.primary, fontSize: 13, fontWeight: "600" }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Progress bar
export function ProgressBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

// Loading button
export function PrimaryButton({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color={c.primaryForeground} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// Ghost button
export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.ghostBtn, { borderColor: c.border }]}
    >
      <Text style={[styles.ghostBtnText, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  kpiCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  kpiSub: {
    fontSize: 11,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  progressBg: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    flex: 1,
  },
  progressFill: {
    height: 6,
    borderRadius: 99,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00e5ff",
    shadowColor: "#00e5ff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryBtnText: {
    color: "#03111c",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  ghostBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
