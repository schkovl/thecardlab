import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Pill } from "@/components/ui";
import { marketListings } from "@/data/mock";

type Filter = "All" | "Raw" | "Slabbed" | "Sealed";
const FILTERS: Filter[] = ["All", "Raw", "Slabbed", "Sealed"];

const sportIcons: Record<string, keyof typeof Feather.glyphMap> = {
  Basketball: "activity",
  Football: "activity",
  Baseball: "activity",
  Pokemon: "zap",
};

export default function MarketScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = filter === "All" ? marketListings : marketListings.filter((l) => l.type === filter);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: c.primary }]}>MARKETPLACE</Text>
          <Text style={[styles.title, { color: c.text }]}>Browse Cards</Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Feather name="search" size={18} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => {
              setFilter(f);
              Haptics.selectionAsync();
            }}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f ? c.primary : c.surface, borderColor: filter === f ? c.primary : c.border },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f ? c.primaryForeground : c.mutedForeground }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
            activeOpacity={0.8}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={[styles.cardImage, { backgroundColor: c.background }]}>
              <Feather name={sportIcons[item.sport] ?? "activity"} size={32} color={c.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardFooter}>
              <View>
                <Text style={[styles.cardPrice, { color: c.text }]}>${item.price.toLocaleString()}</Text>
                <Text style={[styles.cardSeller, { color: c.mutedForeground }]}>{item.seller}</Text>
              </View>
              <Pill
                label={item.type}
                variant={item.type === "Raw" ? "gold" : item.type === "Slabbed" ? "cyan" : "violet"}
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={36} color="#64748b" />
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No listings match this filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 8 },
  filterScroll: { maxHeight: 54 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: "700" },
  grid: { paddingHorizontal: 12, paddingTop: 12 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  card: { flex: 1, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardImage: { height: 110, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontWeight: "700", paddingHorizontal: 12, paddingTop: 10, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 12, paddingTop: 8 },
  cardPrice: { fontSize: 17, fontWeight: "900" },
  cardSeller: { fontSize: 11, marginTop: 1 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14 },
});
