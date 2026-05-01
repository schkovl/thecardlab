import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Pill, SectionHeader } from "@/components/ui";
import { portfolioHoldings } from "@/data/mock";

const TOTAL_VALUE = 1938;
const TOTAL_COST = 1052;
const TOTAL_GAIN = 886;
const GAIN_PCT = 84.2;

export default function PortfolioScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<"gain" | "value" | "alpha">("gain");

  const sorted = [...portfolioHoldings].sort((a, b) => {
    if (sort === "gain") return b.gainPct - a.gainPct;
    if (sort === "value") return b.value - a.value;
    return a.card.localeCompare(b.card);
  });

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: c.primary }]}>PORTFOLIO</Text>
          <Text style={[styles.totalValue, { color: c.text }]}>${(TOTAL_VALUE).toLocaleString()}</Text>
          <View style={styles.gainRow}>
            <Feather name="trending-up" size={13} color={c.secondary} />
            <Text style={[styles.gainText, { color: c.secondary }]}>
              +${TOTAL_GAIN.toLocaleString()} · +{GAIN_PCT}%
            </Text>
            <Text style={[styles.gainSub, { color: c.mutedForeground }]}>all time</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Feather name="plus" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Summary row */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Total Cost" value={`$${TOTAL_COST.toLocaleString()}`} color={c.mutedForeground} c={c} />
          <SummaryCard label="Current Value" value={`$${TOTAL_VALUE.toLocaleString()}`} color={c.primary} c={c} />
          <SummaryCard label="Total Gain" value={`+$${TOTAL_GAIN.toLocaleString()}`} color={c.secondary} c={c} />
        </View>

        {/* Sort tabs */}
        <View style={styles.sortRow}>
          {(["gain", "value", "alpha"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSort(s)}
              style={[
                styles.sortChip,
                { backgroundColor: sort === s ? c.primary : c.surface, borderColor: sort === s ? c.primary : c.border },
              ]}
            >
              <Text style={[styles.sortText, { color: sort === s ? c.primaryForeground : c.mutedForeground }]}>
                {s === "gain" ? "% Gain" : s === "value" ? "Value" : "A–Z"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Holdings list */}
        <SectionHeader title="Holdings" />
        {sorted.map((item) => (
          <View key={item.id} style={[styles.holdingRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.holdingAvatar, { backgroundColor: c.background }]}>
              <Feather name="credit-card" size={16} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.holdingCard, { color: c.text }]} numberOfLines={1}>{item.card}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <Pill label={item.grade} variant={item.grade.includes("PSA") ? "teal" : "gold"} />
                <Text style={[styles.holdingCost, { color: c.mutedForeground }]}>Cost ${item.cost}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.holdingValue, { color: c.text }]}>${item.value}</Text>
              <Text style={[styles.holdingGain, { color: c.secondary }]}>+{item.gainPct}%</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value, color, c }: { label: string; value: string; color: string; c: any }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={{ color: c.mutedForeground, fontSize: 10, fontWeight: "800" }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontSize: 15, fontWeight: "900", letterSpacing: -0.4, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  totalValue: { fontSize: 38, fontWeight: "900", letterSpacing: -1.5, marginTop: 2 },
  gainRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  gainText: { fontSize: 14, fontWeight: "800" },
  gainSub: { fontSize: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 8 },
  scroll: { padding: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12 },
  sortRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  sortText: { fontSize: 12, fontWeight: "700" },
  holdingRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  holdingAvatar: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  holdingCard: { fontSize: 13, fontWeight: "700" },
  holdingCost: { fontSize: 11 },
  holdingValue: { fontSize: 15, fontWeight: "900" },
  holdingGain: { fontSize: 12, fontWeight: "700", marginTop: 2 },
});
