import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Pill, SectionHeader } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPortfolioHoldings,
  useCreatePortfolioHolding,
  useDeletePortfolioHolding,
  getListPortfolioHoldingsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";

const GRADES = ["Raw", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5"];

export default function PortfolioScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const qc = useQueryClient();

  const [sort, setSort] = useState<"gain" | "value" | "alpha">("gain");
  const [showAdd, setShowAdd] = useState(false);
  const [cardName, setCardName] = useState("");
  const [grade, setGrade] = useState("PSA 9");
  const [cost, setCost] = useState("");
  const [value, setValue] = useState("");

  const { data: holdings = [], isLoading, refetch } = useListPortfolioHoldings({
    query: {
      enabled: !!isSignedIn,
      queryKey: getListPortfolioHoldingsQueryKey(),
    },
  });

  const createMutation = useCreatePortfolioHolding({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() });
        setShowAdd(false);
        setCardName("");
        setCost("");
        setValue("");
        setGrade("PSA 9");
      },
      onError: () => Alert.alert("Error", "Failed to add card"),
    },
  });

  const deleteMutation = useDeletePortfolioHolding({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPortfolioHoldingsQueryKey() }),
      onError: () => Alert.alert("Error", "Failed to remove card"),
    },
  });

  const handleAdd = () => {
    if (!cardName || !cost || !value) {
      Alert.alert("Missing Fields", "Please fill in all fields");
      return;
    }
    createMutation.mutate({
      data: {
        card: cardName,
        grade,
        cost: parseInt(cost, 10),
        value: parseInt(value, 10),
      },
    });
  };

  const handleDelete = (id: string, card: string) => {
    Alert.alert("Remove Card", `Remove "${card}" from your portfolio?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id }),
      },
    ]);
  };

  const sorted = [...holdings].sort((a, b) => {
    if (sort === "gain") return b.gainPct - a.gainPct;
    if (sort === "value") return b.value - a.value;
    return a.card.localeCompare(b.card);
  });

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalCost = holdings.reduce((s, h) => s + h.cost, 0);
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(1) : "0.0";

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: c.primary }]}>PORTFOLIO</Text>
          <Text style={[styles.totalValue, { color: c.text }]}>${totalValue.toLocaleString()}</Text>
          <View style={styles.gainRow}>
            <Feather name="trending-up" size={13} color={c.secondary} />
            <Text style={[styles.gainText, { color: c.secondary }]}>
              +${totalGain.toLocaleString()} · +{gainPct}%
            </Text>
            <Text style={[styles.gainSub, { color: c.mutedForeground }]}>all time</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => setShowAdd(true)}
        >
          <Feather name="plus" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Summary row */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Total Cost" value={`$${totalCost.toLocaleString()}`} color={c.mutedForeground} c={c} />
          <SummaryCard label="Current Value" value={`$${totalValue.toLocaleString()}`} color={c.primary} c={c} />
          <SummaryCard label="Total Gain" value={`+$${totalGain.toLocaleString()}`} color={c.secondary} c={c} />
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

        {!isSignedIn ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Sign in to see your portfolio</Text>
        ) : isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
        ) : holdings.length === 0 ? (
          <TouchableOpacity onPress={() => setShowAdd(true)}>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No cards yet — tap + to add your first</Text>
          </TouchableOpacity>
        ) : (
          sorted.map((item) => (
            <TouchableOpacity
              key={item.id}
              onLongPress={() => handleDelete(item.id, item.card)}
              style={[styles.holdingRow, { backgroundColor: c.surface, borderColor: c.border }]}
            >
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
                <Text style={[styles.holdingGain, { color: c.secondary }]}>+{item.gainPct.toFixed(1)}%</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {holdings.length > 0 && (
          <Text style={[styles.hintText, { color: c.mutedForeground }]}>Long press a card to remove it</Text>
        )}
      </ScrollView>

      {/* Add Card Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Add to Portfolio</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Feather name="x" size={22} color={c.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: c.label }]}>Card Name *</Text>
            <TextInput
              value={cardName}
              onChangeText={setCardName}
              placeholder="e.g. 2023 Prizm Wembanyama Silver RC"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
            />

            <Text style={[styles.inputLabel, { color: c.label }]}>Grade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GRADES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGrade(g)}
                    style={[
                      styles.gradeChip,
                      { backgroundColor: grade === g ? c.primary : c.background, borderColor: grade === g ? c.primary : c.border }
                    ]}
                  >
                    <Text style={{ color: grade === g ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: c.label }]}>Cost ($) *</Text>
                <TextInput
                  value={cost}
                  onChangeText={setCost}
                  placeholder="0"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="numeric"
                  style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: c.label }]}>Value ($) *</Text>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="0"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="numeric"
                  style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={createMutation.isPending}
              style={[styles.addBtn, { backgroundColor: c.primary, opacity: createMutation.isPending ? 0.6 : 1 }]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color={c.primaryForeground} size="small" />
              ) : (
                <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 15 }}>Add to Portfolio</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({ label, value, color, c }: { label: string; value: string; color: string; c: ReturnType<typeof useColors> }) {
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
  emptyText: { textAlign: "center", marginTop: 32, fontSize: 14 },
  hintText: { textAlign: "center", fontSize: 11, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 14 },
  gradeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  addBtn: { borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center", marginTop: 4 },
});
