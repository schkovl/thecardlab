import React, { useMemo, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { KpiCard, SectionHeader, Pill } from "@/components/ui";
import { recentScans } from "@/data/mock";
import {
  useListPortfolioHoldings,
  useListScanResults,
  useListGradingSubmissions,
  useListWantlistItems,
  getListPortfolioHoldingsQueryKey,
  getListScanResultsQueryKey,
  getListGradingSubmissionsQueryKey,
  getListWantlistItemsQueryKey,
} from "@workspace/api-client-react";

export default function DashboardScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const { data: holdings = [], refetch: refetchHoldings, isRefetching: ref1 } = useListPortfolioHoldings({
    query: { enabled: !!isSignedIn, queryKey: getListPortfolioHoldingsQueryKey() },
  });
  const { data: scans = [], refetch: refetchScans, isRefetching: ref2 } = useListScanResults({
    query: { enabled: !!isSignedIn, queryKey: getListScanResultsQueryKey() },
  });
  const { data: submissions = [], refetch: refetchSubs, isRefetching: ref3 } = useListGradingSubmissions({
    query: { enabled: !!isSignedIn, queryKey: getListGradingSubmissionsQueryKey() },
  });
  const { data: wants = [], refetch: refetchWants, isRefetching: ref4 } = useListWantlistItems({
    query: { enabled: !!isSignedIn, queryKey: getListWantlistItemsQueryKey() },
  });

  const isRefetching = ref1 || ref2 || ref3 || ref4;
  const onRefresh = () => {
    refetchHoldings();
    refetchScans();
    refetchSubs();
    refetchWants();
  };

  const { totalValue, totalGain, gainPct, openSubs } = useMemo(() => {
    const value = holdings.reduce((s, h) => s + h.value, 0);
    const cost = holdings.reduce((s, h) => s + h.cost, 0);
    const gain = value - cost;
    const pct = cost > 0 ? ((gain / cost) * 100) : 0;
    const open = submissions.filter((s) => !["completed", "graded"].includes(s.status)).length;
    return { totalValue: value, totalGain: gain, gainPct: pct, openSubs: open };
  }, [holdings, submissions]);

  const portfolioValueDisplay = isSignedIn
    ? `$${totalValue.toLocaleString()}`
    : "$278,420";
  const portfolioSub = isSignedIn
    ? holdings.length === 0
      ? "Add your first card"
      : `${totalGain >= 0 ? "▲" : "▼"} ${totalGain >= 0 ? "+" : ""}$${Math.abs(totalGain).toLocaleString()} · ${gainPct.toFixed(1)}%`
    : "▲ 12.4% vs last month";

  const scansCount = isSignedIn ? String(scans.length) : "127";
  const scansSub = isSignedIn
    ? scans.length === 0 ? "No scans yet" : `${scans.length} all-time scans`
    : "+18 this week";

  const gradingValue = isSignedIn ? String(submissions.length) : "47";
  const gradingSub = isSignedIn
    ? submissions.length === 0 ? "Log your first submission" : `${openSubs} in progress`
    : "Top 18% of Pro users";

  const activeWants = wants.filter((w) => !w.acquired).length;
  const acquiredWants = wants.filter((w) => w.acquired).length;
  const wantsValue = isSignedIn ? String(activeWants) : "8";
  const wantsSub = isSignedIn
    ? wants.length === 0 ? "Add cards to hunt" : `${acquiredWants} acquired`
    : "Hunting now";

  const recentList = isSignedIn && scans.length > 0
    ? scans.slice(0, 4).map((s) => ({
        id: s.id,
        player: s.cardName,
        year: s.year ?? "",
        set: s.setName ?? "",
        variant: s.parallel ?? "",
        action: s.recommendedAction ?? "Review",
        roi: s.roi ?? 0,
      }))
    : recentScans.slice(0, 4).map((s) => ({
        id: s.id,
        player: s.player,
        year: s.year,
        set: s.set,
        variant: s.variant,
        action: s.action,
        roi: s.roi,
      }));

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
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
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        <View style={styles.kpiRow}>
          <KpiCard label="Portfolio Value" value={portfolioValueDisplay} sub={portfolioSub} accent={c.text} />
          <KpiCard label="AI Scans" value={scansCount} sub={scansSub} accent={c.secondary} />
        </View>
        <View style={[styles.kpiRow, { marginTop: 10 }]}>
          <KpiCard label="Grading Pipeline" value={gradingValue} sub={gradingSub} accent={c.accent} />
          <KpiCard label="Wantlist" value={wantsValue} sub={wantsSub} accent={c.primary} />
        </View>

        {/* Quick Actions */}
        <View style={{ marginTop: 18 }}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsRow}>
            <QuickAction
              icon="clipboard"
              label="Grading"
              sub="PSA · BGS"
              c={c}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/grading");
              }}
            />
            <QuickAction
              icon="bookmark"
              label="Wantlist"
              sub="Hunting"
              c={c}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/wantlist");
              }}
            />
            <QuickAction
              icon="search"
              label="Scan"
              sub="AI deal"
              c={c}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screener");
              }}
            />
          </View>
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
          <SectionHeader
            title="Recent AI Scans"
            action="View All →"
            onAction={() => router.push("/screener")}
          />
          {recentList.map((scan) => (
            <ScanRow key={scan.id} scan={scan} c={c} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

type RowColors = ReturnType<typeof useColors>;

const QuickAction = memo(function QuickAction({
  icon,
  label,
  sub,
  c,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub: string;
  c: RowColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.quickAction, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: c.background }]}>
        <Feather name={icon} size={18} color={c.primary} />
      </View>
      <Text style={[styles.quickLabel, { color: c.text }]}>{label}</Text>
      <Text style={[styles.quickSub, { color: c.mutedForeground }]}>{sub}</Text>
    </TouchableOpacity>
  );
});

const ScanRow = memo(function ScanRow({
  scan,
  c,
}: {
  scan: { id: string; player: string; year: string; set: string; variant: string; action: string; roi: number };
  c: RowColors;
}) {
  const variant = scan.action === "Submit" ? "teal" : scan.action === "Pass" ? "red" : "gold";
  return (
    <View style={[styles.scanRow, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.scanAvatar, { backgroundColor: c.background }]}>
        <Feather name="credit-card" size={18} color={c.primary} />
      </View>
      <View style={styles.scanInfo}>
        <Text style={[styles.scanPlayer, { color: c.text }]} numberOfLines={1}>{scan.player}</Text>
        <Text style={[styles.scanSet, { color: c.mutedForeground }]} numberOfLines={1}>
          {scan.year} {scan.set}{scan.variant ? ` • ${scan.variant}` : ""}
        </Text>
      </View>
      <View style={styles.scanRight}>
        <Pill label={scan.action} variant={variant} />
        {scan.roi ? <Text style={[styles.scanRoi, { color: c.secondary }]}>+{scan.roi}% ROI</Text> : null}
      </View>
    </View>
  );
});

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
  actionsRow: { flexDirection: "row", gap: 10 },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "flex-start",
    gap: 8,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontWeight: "800" },
  quickSub: { fontSize: 11 },
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
