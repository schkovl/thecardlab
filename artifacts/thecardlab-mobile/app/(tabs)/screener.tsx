import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Pill, PrimaryButton, GhostButton, SectionHeader, ProgressBar } from "@/components/ui";

const DEMO_RESULT = {
  player: "Victor Wembanyama",
  year: "2023",
  set: "Panini Prizm",
  card_number: "136",
  parallel: "Silver Prizm",
  image_quality_score: 67,
  condition_scores: { centering: 8.2, corners: 7.8, edges: 8.1, surface_visibility: 6.4 },
  estimated_grade_range: "PSA 8–9",
  confidence_score: 62,
  market_comps: { raw: [35, 45], psa_8: [55, 70], psa_9: [95, 120], psa_10: [240, 310] },
  expected_roi: 58,
  recommended_action: "Manual Review",
};

export default function ScreenerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [shipping, setShipping] = useState("4.99");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<typeof DEMO_RESULT | null>(null);

  const analyze = () => {
    if (!url.trim() && !askingPrice.trim()) {
      loadDemo();
      return;
    }
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setLoading(false);
      setResult(DEMO_RESULT);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1800);
  };

  const loadDemo = () => {
    setUrl("https://www.ebay.com/itm/4058923412");
    setAskingPrice("38");
    setShipping("4.99");
    setTimeout(analyze, 300);
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
        {/* Input */}
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
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, alignItems: "center", paddingVertical: 32 }]}>
            <ActivityIndicator color={c.primary} size="large" />
            <Text style={[styles.loadingText, { color: c.text }]}>Analyzing with Vision Model v4.2</Text>
            <Text style={[styles.loadingSub, { color: c.mutedForeground }]}>Detecting edges • Centering • Surface • Image quality</Text>
          </View>
        )}

        {result && !loading && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginTop: 12 }]}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultPlayer, { color: c.text }]}>{result.player} {result.year}</Text>
                <Text style={[styles.resultSet, { color: c.mutedForeground }]}>
                  {result.set} #{result.card_number} • {result.parallel}
                </Text>
              </View>
              <Pill label={result.recommended_action} variant={actionPill(result.recommended_action) as any} />
            </View>

            <View style={styles.statsRow}>
              <Stat label="PSA RANGE" value={result.estimated_grade_range} sub={`${result.confidence_score}% conf.`} color={c.text} />
              <Stat label="IMAGE QUALITY" value={`${result.image_quality_score}`} sub="/100" color={c.accent} />
              <Stat label="EST. ROI" value={`+${result.expected_roi}%`} sub="if PSA 9" color={c.secondary} />
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionMini, { color: c.label }]}>CONDITION RISK</Text>
              {Object.entries(result.condition_scores).map(([k, v]) => (
                <View key={k} style={styles.condRow}>
                  <Text style={[styles.condLabel, { color: c.mutedForeground }]}>{k.charAt(0).toUpperCase() + k.slice(1).replace("_", " ")}</Text>
                  <ProgressBar value={v} max={10} color={v >= 8 ? c.secondary : v >= 7 ? c.accent : c.danger} />
                  <Text style={[styles.condVal, { color: c.text }]}>{v}</Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionMini, { color: c.label }]}>MARKET COMPS</Text>
              <View style={styles.compsGrid}>
                <CompRow label="Raw" min={result.market_comps.raw[0]} max={result.market_comps.raw[1]} c={c} />
                <CompRow label="PSA 8" min={result.market_comps.psa_8[0]} max={result.market_comps.psa_8[1]} c={c} />
                <CompRow label="PSA 9" min={result.market_comps.psa_9[0]} max={result.market_comps.psa_9[1]} c={c} />
                <CompRow label="PSA 10" min={result.market_comps.psa_10[0]} max={result.market_comps.psa_10[1]} c={c} />
              </View>
            </View>

            <View style={[styles.actionsRow, { marginTop: 20 }]}>
              <PrimaryButton label="Add to Portfolio" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} />
              <GhostButton label="Watch Price" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
            </View>
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
      <Text style={{ color, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 }}>{value}</Text>
      <Text style={{ color: "#64748b", fontSize: 10 }}>{sub}</Text>
    </View>
  );
}

function CompRow({ label, min, max, c }: { label: string; min: number; max: number; c: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: "700" }}>${min}–${max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 2 },
  scroll: { padding: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
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
});
