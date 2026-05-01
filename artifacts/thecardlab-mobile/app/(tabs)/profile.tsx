import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Pill, PrimaryButton } from "@/components/ui";

const STATS = [
  { label: "AI Scans", value: "284", icon: "zap" as const },
  { label: "Cards Graded", value: "47", icon: "award" as const },
  { label: "Portfolio Gain", value: "+$886", icon: "trending-up" as const },
  { label: "Day Streak", value: "14", icon: "calendar" as const },
];

const MENU_ITEMS: Array<{ icon: keyof typeof Feather.glyphMap; label: string; sub?: string; danger?: boolean }> = [
  { icon: "bell", label: "Price Drop Alerts", sub: "3 active" },
  { icon: "shield", label: "Global Vault", sub: "5 items secured" },
  { icon: "calendar", label: "Card Shows", sub: "2 upcoming" },
  { icon: "tool", label: "Restoration Lab", sub: "1 in progress" },
  { icon: "help-circle", label: "Help & Support" },
  { icon: "log-out", label: "Sign Out", danger: true },
];

export default function ProfileScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = React.useState(true);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>AC</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: c.text }]}>Alex Carter</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Pill label="Pro Member" variant="teal" />
              <Text style={[styles.streak, { color: c.accent }]}>🔥 14-day streak</Text>
            </View>
          </View>
        </View>

        {/* Plan card */}
        <View style={[styles.planCard, { backgroundColor: c.surface, borderColor: c.border, borderColor: `${c.secondary}60` }]}>
          <View style={styles.planRow}>
            <View>
              <Text style={[styles.planLabel, { color: c.mutedForeground }]}>CURRENT PLAN</Text>
              <Text style={[styles.planValue, { color: c.accent }]}>Pro • $9.99/mo</Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: `${c.secondary}20` }]}>
              <Text style={[styles.activeBadgeText, { color: c.secondary }]}>ACTIVE</Text>
            </View>
          </View>
          <PrimaryButton
            label="Manage Subscription"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("Subscription", "Connect Stripe to manage your Pro subscription.", [{ text: "OK" }]);
            }}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Feather name={s.icon} size={18} color={c.primary} />
              <Text style={[styles.statValue, { color: c.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Notifications toggle */}
        <View style={[styles.toggleRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.toggleLeft}>
            <Feather name="bell" size={18} color={c.primary} />
            <Text style={[styles.toggleLabel, { color: c.text }]}>Push Notifications</Text>
          </View>
          <Switch
            value={notifs}
            onValueChange={(v) => {
              setNotifs(v);
              Haptics.selectionAsync();
            }}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[
                styles.menuItem,
                idx < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              ]}
            >
              <Feather name={item.icon} size={18} color={item.danger ? c.danger : c.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: item.danger ? c.danger : c.text }]}>{item.label}</Text>
                {item.sub ? <Text style={[styles.menuSub, { color: c.mutedForeground }]}>{item.sub}</Text> : null}
              </View>
              <Feather name="chevron-right" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.version, { color: c.mutedForeground }]}>TheCardLab v8 Optimized</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  scroll: { padding: 16, gap: 12 },
  userCard: { borderRadius: 18, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#03111c", fontWeight: "900", fontSize: 18 },
  userName: { fontSize: 20, fontWeight: "900" },
  streak: { fontSize: 12, fontWeight: "700" },
  planCard: { borderRadius: 18, borderWidth: 2, padding: 16, gap: 14 },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  planValue: { fontSize: 18, fontWeight: "900", marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  activeBadgeText: { fontSize: 10, fontWeight: "900" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flex: 1, minWidth: "44%", borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { fontSize: 11 },
  toggleRow: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  menuCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  menuLabel: { fontSize: 15, fontWeight: "600" },
  menuSub: { fontSize: 12, marginTop: 1 },
  version: { textAlign: "center", fontSize: 11, paddingVertical: 8 },
});
