import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Pill, PrimaryButton, GhostButton, SectionHeader, ProgressBar } from "@/components/ui";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAnalyzeListing,
  useCreateScanResult,
  useCreatePortfolioHolding,
  useListScanResults,
  getListScanResultsQueryKey,
  getListPortfolioHoldingsQueryKey,
} from "@workspace/api-client-react";

type AnalysisResult = {
  cardName: string;
  player: string;
  year: string;
  setName: string;
  cardNumber: string;
  parallel: string;
  estGrade: string;
  gradeRange: string;
  probability: number;
  estValue: number;
  roi: number;
  recommendedAction: string;
  imageQualityScore: number;
  condition: Record<string, { score: number; status: string }>;
  notes: string[];
  marketComps: { raw: number[]; psa8: number[]; psa9: number[]; psa10: number[] };
};

export default function ScreenerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const qc = useQueryClient();

  const [url, setUrl] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [shipping, setShipping] = useState("4.99");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [addedToPortfolio, setAddedToPortfolio] = useState(false);

  const { data: scanHistory = [] } = useListScanResults({
    query: { enabled: !!isSignedIn, queryKey: getListScanResultsQueryKey() },
  });

  const saveScanMutation = useCreateScanResult({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListScanResultsQueryKey() }),
    },
  });

  const addToPortfolioMutation = useCreatePortfolioHolding({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() });
        setAddedToPortfolio(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => Alert.alert("Error", "Failed to add to portfolio"),
    },
  });

  const analyzeListingMutation = useAnalyzeListing({
    mutation: {
      onSuccess: (data) => {
        const r = data as AnalysisResult;
        setResult(r);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (isSignedIn) {
          saveScanMutation.mutate({
            data: {
              cardName: r.cardName,
              year: r.year,
              setName: r.setName,
              parallel: r.parallel,
              askingPrice: askingPrice ? parseFloat(askingPrice) : undefined,
              shipping: shipping ? parseFloat(shipping) : undefined,
              estValue: r.estValue,
              estGrade: r.estGrade,
              gradeRange: r.gradeRange,
              probability: r.probability,
              roi: r.roi,
              recommendedAction: r.recommendedAction,
              imageQualityScore: r.imageQualityScore,
            },
          });
        }
      },
      onError: () => {
        Alert.alert("Analysis Failed", "Could not analyze the listing. Check the URL and try again.");
      },
    },
  });

  const loading = analyzeListingMutation.isPending;

  const analyze = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      loadDemo();
      return;
    }
    setResult(null);
    setAddedToPortfolio(false);
    analyzeListingMutation.mutate({
      data: {
        listingUrl: trimmedUrl,
        askingPrice: askingPrice ? parseFloat(askingPrice) : undefined,
        shipping: shipping ? parseFloat(shipping) : undefined,
      },
    });
  };

  const loadDemo = () => {
    setUrl("https://www.ebay.com/itm/2023-Panini-Prizm-Victor-Wembanyama-Silver-Prizm-136/405892341286");
    setAskingPrice("38");
    setShipping("4.99");
  };

  const handleAddToPortfolio = () => {
    if (!result) return;
    if (!isSignedIn) {
      Alert.alert("Sign In", "Sign in to add cards to your portfolio");
      return;
    }
    addToPortfolioMutation.mutate({
      data: {
        card: result.cardName,
        grade: result.estGrade,
        cost: askingPrice
          ? Math.round(parseFloat(askingPrice) + parseFloat(shipping || "0"))
          : result.estValue,
        value: result.estValue,
      },
    });
  };

  const actionPill = (action: string) => {
    if (action === "Submit") return "teal";
    if (action === "Pass") return "red";
    return "gold";
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>Deal Screener</Text>
        <Text style={[styles.eyebrow, { color: c.primary }]}>AI ANALYSIS</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <SectionHeader title="Input Listing" />

          <Text style={[styles.inputLabel, { color: c.label }]}>Marketplace URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://www.ebay.com/itm/..."
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: c.label }]}>Asking Price ($)</Text>
              <TextInput
                value={askingPrice}
                onChangeText={setAskingPrice}
                placeholder="38"
                placeholderTextColor={c.mutedForeground}
                style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: c.label }]}>Shipping ($)</Text>
              <TextInput
                value={shipping}
                onChangeText={setShipping}
                placeholder="4.99"
                placeholderTextColor={c.mutedForeground}
                style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                keyboardType="numeric"
              />
            </View>
          </View>

          <PrimaryButton label={loading ? "Analyzing…" : "Analyze with AI"} onPress={analyze} loading={loading} />

          <TouchableOpacity onPress={loadDemo} style={styles.demoBtn}>
            <Feather name="play-circle" size={14} color={c.primary} />
            <Text style={[styles.demoBtnText, { color: c.primary }]}>Load Demo Listing</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, alignItems: "center", paddingVertical: 32, marginTop: 12 }]}>
            <ActivityIndicator color={c.primary} size="large" />
            <Text style={[styles.loadingText, { color: c.text }]}>AI Analyzing Listing…</Text>
            <Text style={[styles.loadingSub, { color: c.mutedForeground }]}>Detecting edges · Centering · Surface · Market comps</Text>
          </View>
        )}

        {result && !loading && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginTop: 12 }]}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultPlayer, { color: c.text }]}>{result.player} {result.year}</Text>
                <Text style={[styles.resultSet, { color: c.mutedForeground }]}>
                  {result.setName} #{result.cardNumber} · {result.parallel}
                </Text>
              </View>
              <Pill label={result.recommendedAction} variant={actionPill(result.recommendedAction) as "teal" | "gold" | "red"} />
            </View>

            <View style={styles.statsRow}>
              <Stat label="PSA RANGE" value={result.gradeRange} sub={`${result.probability}% conf.`} color={c.text} />
              <Stat label="IMAGE QUALITY" value={`${result.imageQualityScore}`} sub="/100" color={c.accent} />
              <Stat label="EST. ROI" value={`${result.roi >= 0 ? "+" : ""}${result.roi}%`} sub="post-grade" color={result.roi >= 0 ? c.secondary : "#f87171"} />
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionMini, { color: c.label }]}>CONDITION RISK</Text>
              {Object.entries(result.condition).map(([k, v]) => (
                <View key={k} style={styles.condRow}>
                  <Text style={[styles.condLabel, { color: c.mutedForeground }]}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                  <ProgressBar value={v.score} max={10} color={v.score >= 8 ? c.secondary : v.score >= 7 ? c.accent : "#f87171"} />
                  <Text style={[styles.condVal, { color: c.text }]}>{v.score}</Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionMini, { color: c.label }]}>MARKET COMPS</Text>
              <View style={styles.compsGrid}>
                <CompRow label="Raw" min={result.marketComps.raw[0]} max={result.marketComps.raw[1]} c={c} />
                <CompRow label="PSA 8" min={result.marketComps.psa8[0]} max={result.marketComps.psa8[1]} c={c} />
                <CompRow label="PSA 9" min={result.marketComps.psa9[0]} max={result.marketComps.psa9[1]} c={c} />
                <CompRow label="PSA 10" min={result.marketComps.psa10[0]} max={result.marketComps.psa10[1]} c={c} />
              </View>
            </View>

            {result.notes.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionMini, { color: c.label }]}>AI ANALYST NOTES</Text>
                {result.notes.map((note, i) => (
                  <Text key={i} style={[styles.noteText, { color: c.mutedForeground }]}>· {note}</Text>
                ))}
              </View>
            )}

            <View style={[styles.actionsRow, { marginTop: 20 }]}>
              <PrimaryButton
                label={addToPortfolioMutation.isPending ? "Adding…" : addedToPortfolio ? "✓ Added" : "Add to Portfolio"}
                onPress={handleAddToPortfolio}
                loading={addToPortfolioMutation.isPending}
              />
              <GhostButton label="Watch Price" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
            </View>
          </View>
        )}

        {isSignedIn && scanHistory.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <SectionHeader title="Scan History" />
            {scanHistory.slice(0, 5).map((scan) => (
              <View key={scan.id} style={[styles.historyRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyCard, { color: c.text }]} numberOfLines={1}>{scan.cardName}</Text>
                  <Text style={[styles.historySub, { color: c.mutedForeground }]}>
                    {new Date(scan.createdAt).toLocaleDateString()}
                    {scan.gradeRange ? ` · ${scan.gradeRange}` : ""}
                  </Text>
                </View>
                {scan.roi != null && (
                  <Text style={[styles.historyRoi, { color: c.secondary }]}>+{scan.roi}%</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 }}>{value}</Text>
      <Text style={{ color: "#64748b", fontSize: 10 }}>{sub}</Text>
    </View>
  );
}

function CompRow({ label, min, max, c }: { label: string; min: number; max: number; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: "700" }}>${min}–${max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 2 },
  scroll: { padding: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  row: { flexDirection: "row", gap: 10 },
  demoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
  demoBtnText: { fontSize: 12, fontWeight: "700" },
  loadingText: { fontSize: 15, fontWeight: "700", marginTop: 14 },
  loadingSub: { fontSize: 12, marginTop: 4, textAlign: "center" },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  resultPlayer: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  resultSet: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  sectionMini: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginBottom: 10 },
  condRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  condLabel: { fontSize: 12, width: 90 },
  condVal: { fontSize: 12, fontWeight: "700", width: 28, textAlign: "right" },
  compsGrid: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8 },
  actionsRow: { gap: 10 },
  historyRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  historyCard: { fontSize: 13, fontWeight: "700" },
  historySub: { fontSize: 11, marginTop: 2 },
  historyRoi: { fontSize: 14, fontWeight: "800" },
  noteText: { fontSize: 12, marginBottom: 6, lineHeight: 18 },
});
