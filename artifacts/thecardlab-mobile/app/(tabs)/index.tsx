import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { KpiCard, SectionHeader, Pill } from "@/components/ui";
import { recentScans } from "@/data/mock";

export default function DashboardScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.wordmark, { color: c.text }]}>
            TheCard<Text style={{ color: c.primary }}>Lab</Text>
          </Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>v8 Optimized • Production Ready</Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Feather name="bell" size={18} color={c.primary} />
          <View style={[styles.dot, { backgroundColor: c.secondary }]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* KPI grid */}
        <View style={styles.kpiRow}>
          <KpiCard label="Portfolio Value" value="$278,420" sub="▲ 12.4% vs last month" accent={c.text} />
          <KpiCard label="Raw Opportunities" value="127" sub="+18 this week" accent={c.secondary} />
        </View>
        <View style={[styles.kpiRow, { marginTop: 10 }]}>
          <KpiCard label="Grading ROI" value="38.6%" sub="Top 18% of Pro users" accent={c.accent} />
          <KpiCard label="AI Accuracy" value="92.7%" sub="1.2M cards analyzed" accent={c.primary} />
        </View>

        {/* Market Pulse */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginTop: 18 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: c.label }]}>MARKET PULSE</Text>
            <Pill label="LIVE" variant="teal" />
          </View>
          <View style={styles.marketPulseRow}>
            <View>
              <Text style={[styles.mutedSm, { color: c.mutedForeground }]}>Overall Trend</Text>
              <Text style={[styles.bullish, { color: c.secondary }]}>BULLISH</Text>
            </View>
            <View style={styles.marketStats}>
              <MarketStat label="Index" value="168.7" up="+4.3%" color={c.primary} />
              <MarketStat label="Vintage" value="+5.6%" color={c.secondary} />
              <MarketStat label="7D Vol" value="$24.8M" color={c.text} />
            </View>
          </View>
        </View>

        {/* Recent Scans */}
        <View style={{ marginTop: 20 }}>
          <SectionHeader title="Recent AI Scans" action="View All →" />
          {recentScans.slice(0, 4).map((scan) => (
            <View
              key={scan.id}
              style={[styles.scanRow, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={[styles.scanAvatar, { backgroundColor: c.background }]}>
                <Feather name="credit-card" size={18} color={c.primary} />
              </View>
              <View style={styles.scanInfo}>
                <Text style={[styles.scanPlayer, { color: c.text }]}>{scan.player}</Text>
                <Text style={[styles.scanSet, { color: c.mutedForeground }]}>
                  {scan.year} {scan.set} • {scan.variant}
                </Text>
              </View>
              <View style={styles.scanRight}>
                <Pill
                  label={scan.action === "Submit" ? "Submit" : scan.action === "Pass" ? "Pass" : "Review"}
                  variant={scan.action === "Submit" ? "teal" : scan.action === "Pass" ? "red" : "gold"}
                />
                <Text style={[styles.scanRoi, { color: c.secondary }]}>+{scan.roi}% ROI</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function MarketStat({ label, value, up, color }: { label: string; value: string; up?: string; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: "#64748b", fontSize: 10 }}>{label}</Text>
      <Text style={{ color, fontWeight: "900", fontSize: 15 }}>{value}</Text>
      {up ? <Text style={{ color: "#22d3a6", fontSize: 10, fontWeight: "700" }}>{up}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  wordmark: { fontSize: 24, fontWeight: "900", letterSpacing: -0.8 },
  sub: { fontSize: 11, marginTop: 1 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scroll: { paddingHorizontal: 16 },
  kpiRow: { flexDirection: "row", gap: 10 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  marketPulseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  mutedSm: { fontSize: 12 },
  bullish: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  marketStats: { flexDirection: "row", gap: 16 },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  scanAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  scanInfo: { flex: 1 },
  scanPlayer: { fontWeight: "700", fontSize: 14 },
  scanSet: { fontSize: 11, marginTop: 2 },
  scanRight: { alignItems: "flex-end", gap: 4 },
  scanRoi: { fontSize: 12, fontWeight: "800" },
});
