import React, { useState, useMemo, memo, useCallback } from "react";
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
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Pill, SectionHeader } from "@/components/ui";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWantlistItems,
  useCreateWantlistItem,
  useUpdateWantlistItem,
  useDeleteWantlistItem,
  getListWantlistItemsQueryKey,
  WantlistItem,
  WantlistItemPriority,
} from "@workspace/api-client-react";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GRADES = ["Raw", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5", "SGC 10"];
const PRIORITIES: WantlistItemPriority[] = ["high", "medium", "low"];

type PriorityVariant = "cyan" | "violet" | "gold";
const PRIORITY_META: Record<WantlistItemPriority, { label: string; variant: PriorityVariant }> = {
  high:   { label: "High",   variant: "cyan"   },
  medium: { label: "Medium", variant: "violet" },
  low:    { label: "Low",    variant: "gold"   },
};

type WantlistContext = { previousItems: WantlistItem[] | undefined };

export default function WantlistScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [cardName, setCardName] = useState("");
  const [targetGrade, setTargetGrade] = useState("PSA 9");
  const [maxPrice, setMaxPrice] = useState("");
  const [priority, setPriority] = useState<WantlistItemPriority>("medium");
  const [notes, setNotes] = useState("");

  const [editItem, setEditItem] = useState<WantlistItem | null>(null);
  const [editGrade, setEditGrade] = useState("PSA 9");
  const [editPrice, setEditPrice] = useState("");
  const [editPriority, setEditPriority] = useState<WantlistItemPriority>("medium");
  const [editNotes, setEditNotes] = useState("");

  const { data: items = [], isLoading, refetch, isRefetching } = useListWantlistItems({
    query: { enabled: !!isSignedIn, queryKey: getListWantlistItemsQueryKey() },
  });

  const resetAddForm = () => {
    setCardName("");
    setTargetGrade("PSA 9");
    setMaxPrice("");
    setPriority("medium");
    setNotes("");
  };

  const createMutation = useCreateWantlistItem({
    mutation: {
      onMutate: async ({ data }): Promise<WantlistContext> => {
        await qc.cancelQueries({ queryKey: getListWantlistItemsQueryKey() });
        const previousItems = qc.getQueryData<WantlistItem[]>(getListWantlistItemsQueryKey());
        const optimistic: WantlistItem = {
          id: `temp-${Date.now()}`,
          cardName: data.cardName,
          targetGrade: data.targetGrade,
          maxPrice: data.maxPrice,
          priority: data.priority ?? "medium",
          notes: data.notes ?? null,
          acquired: false,
          createdAt: new Date().toISOString(),
        };
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        qc.setQueryData<WantlistItem[]>(
          getListWantlistItemsQueryKey(),
          (old) => [optimistic, ...(old ?? [])]
        );
        return { previousItems };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as WantlistContext | undefined;
        if (ctx?.previousItems !== undefined) {
          qc.setQueryData(getListWantlistItemsQueryKey(), ctx.previousItems);
        }
        Alert.alert("Error", "Failed to add to wantlist");
      },
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdd(false);
        resetAddForm();
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: getListWantlistItemsQueryKey() });
      },
    },
  });

  const updateMutation = useUpdateWantlistItem({
    mutation: {
      onMutate: async ({ id, data }): Promise<WantlistContext> => {
        await qc.cancelQueries({ queryKey: getListWantlistItemsQueryKey() });
        const previousItems = qc.getQueryData<WantlistItem[]>(getListWantlistItemsQueryKey());
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        qc.setQueryData<WantlistItem[]>(
          getListWantlistItemsQueryKey(),
          (old) =>
            (old ?? []).map((item) => {
              if (item.id !== id) return item;
              return {
                ...item,
                cardName: data.cardName ?? item.cardName,
                targetGrade: data.targetGrade ?? item.targetGrade,
                maxPrice: data.maxPrice ?? item.maxPrice,
                priority: data.priority ?? item.priority,
                notes: data.notes !== undefined ? data.notes : item.notes,
                acquired: data.acquired ?? item.acquired,
              };
            })
        );
        return { previousItems };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as WantlistContext | undefined;
        if (ctx?.previousItems !== undefined) {
          qc.setQueryData(getListWantlistItemsQueryKey(), ctx.previousItems);
        }
        Alert.alert("Error", "Failed to update item");
      },
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditItem(null);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: getListWantlistItemsQueryKey() });
      },
    },
  });

  const deleteMutation = useDeleteWantlistItem({
    mutation: {
      onMutate: async ({ id }): Promise<WantlistContext> => {
        await qc.cancelQueries({ queryKey: getListWantlistItemsQueryKey() });
        const previousItems = qc.getQueryData<WantlistItem[]>(getListWantlistItemsQueryKey());
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        qc.setQueryData<WantlistItem[]>(
          getListWantlistItemsQueryKey(),
          (old) => (old ?? []).filter((item) => item.id !== id)
        );
        return { previousItems };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as WantlistContext | undefined;
        if (ctx?.previousItems !== undefined) {
          qc.setQueryData(getListWantlistItemsQueryKey(), ctx.previousItems);
        }
        Alert.alert("Error", "Failed to remove item");
      },
      onSuccess: () => {
        setEditItem(null);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: getListWantlistItemsQueryKey() });
      },
    },
  });

  const handleAdd = () => {
    if (!cardName.trim() || !maxPrice) {
      Alert.alert("Missing Info", "Card name and max price are required");
      return;
    }
    const price = parseInt(maxPrice, 10);
    if (isNaN(price) || price < 0) {
      Alert.alert("Invalid Price", "Max price must be a positive number");
      return;
    }
    createMutation.mutate({
      data: {
        cardName: cardName.trim(),
        targetGrade,
        maxPrice: price,
        priority,
        notes: notes.trim() || undefined,
      },
    });
  };

  const openEdit = useCallback((item: WantlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditItem(item);
    setEditGrade(item.targetGrade);
    setEditPrice(String(item.maxPrice));
    setEditPriority(item.priority);
    setEditNotes(item.notes ?? "");
  }, []);

  const handleSaveEdit = () => {
    if (!editItem) return;
    const price = parseInt(editPrice, 10);
    if (isNaN(price) || price < 0) {
      Alert.alert("Invalid Price", "Max price must be a positive number");
      return;
    }
    updateMutation.mutate({
      id: editItem.id,
      data: {
        targetGrade: editGrade,
        maxPrice: price,
        priority: editPriority,
        notes: editNotes.trim() || undefined,
      },
    });
  };

  const markAcquired = useCallback((item: WantlistItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateMutation.mutate({ id: item.id, data: { acquired: true } });
  }, [updateMutation]);

  const handleDeleteFromEdit = () => {
    if (!editItem) return;
    Alert.alert("Remove Item", `Remove "${editItem.cardName}" from your wantlist?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: editItem.id }),
      },
    ]);
  };

  const { active, acquired } = useMemo(() => {
    const order: Record<WantlistItemPriority, number> = { high: 0, medium: 1, low: 2 };
    const sortedActive = items
      .filter((i) => !i.acquired)
      .sort((a, b) => order[a.priority] - order[b.priority]);
    return {
      active: sortedActive,
      acquired: items.filter((i) => i.acquired),
    };
  }, [items]);

  const isMutating = updateMutation.isPending || deleteMutation.isPending;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.primary }]}>COLLECTION</Text>
          <Text style={[styles.title, { color: c.text }]}>Wantlist</Text>
        </View>
        {isSignedIn && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAdd(true);
            }}
          >
            <Feather name="plus" size={20} color={c.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        {!isSignedIn ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Sign in to manage your wantlist</Text>
        ) : isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Feather name="bookmark" size={40} color={c.primary} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>Your wantlist is empty</Text>
            <Text style={[styles.emptySub, { color: c.mutedForeground }]}>
              Add cards you're hunting so you always know your max buy price.
            </Text>
            <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.emptyBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 14 }}>Add First Card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <SectionHeader title={`Hunting — ${active.length}`} />
                {active.map((item) => (
                  <WantRow
                    key={item.id}
                    item={item}
                    onPress={openEdit}
                    onAcquire={markAcquired}
                    c={c}
                  />
                ))}
              </View>
            )}
            {acquired.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <SectionHeader title={`Acquired — ${acquired.length}`} />
                {acquired.map((item) => (
                  <AcquiredRow
                    key={item.id}
                    item={item}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    c={c}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.hintText, { color: c.mutedForeground }]}>Tap a card to edit · Use ✓ to mark as acquired</Text>
          </>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            style={{ width: "100%" }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalSheet, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text }]}>Add to Wantlist</Text>
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

              <Text style={[styles.inputLabel, { color: c.label }]}>Target Grade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {GRADES.map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setTargetGrade(g)}
                      style={[
                        styles.chip,
                        { backgroundColor: targetGrade === g ? c.primary : c.background, borderColor: targetGrade === g ? c.primary : c.border },
                      ]}
                    >
                      <Text style={{ color: targetGrade === g ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.inputLabel, { color: c.label }]}>Max Buy Price ($) *</Text>
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholder="0"
                placeholderTextColor={c.mutedForeground}
                keyboardType="numeric"
                style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
              />

              <Text style={[styles.inputLabel, { color: c.label }]}>Priority</Text>
              <View style={[styles.chipRow, { marginBottom: 14 }]}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.priorityChip,
                      { backgroundColor: priority === p ? c.primary : c.background, borderColor: priority === p ? c.primary : c.border },
                    ]}
                  >
                    <Text style={{ color: priority === p ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "800" }}>
                      {PRIORITY_META[p].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.label }]}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Rookie year only, prefer centered"
                placeholderTextColor={c.mutedForeground}
                style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
              />

              <TouchableOpacity
                onPress={handleAdd}
                disabled={createMutation.isPending}
                style={[styles.primaryBtn, { backgroundColor: c.primary, opacity: createMutation.isPending ? 0.6 : 1 }]}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={c.primaryForeground} size="small" />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 15 }}>Add to Wantlist</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView
            style={{ width: "100%" }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalSheet, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text }]}>Edit Item</Text>
                <TouchableOpacity onPress={() => setEditItem(null)}>
                  <Feather name="x" size={22} color={c.mutedForeground} />
                </TouchableOpacity>
              </View>

              {editItem && (
                <Text style={[styles.editCardName, { color: c.mutedForeground }]} numberOfLines={1}>
                  {editItem.cardName}
                </Text>
              )}

              <Text style={[styles.inputLabel, { color: c.label }]}>Target Grade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {GRADES.map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setEditGrade(g)}
                      style={[
                        styles.chip,
                        { backgroundColor: editGrade === g ? c.primary : c.background, borderColor: editGrade === g ? c.primary : c.border },
                      ]}
                    >
                      <Text style={{ color: editGrade === g ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.inputLabel, { color: c.label }]}>Max Buy Price ($)</Text>
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="0"
                placeholderTextColor={c.mutedForeground}
                keyboardType="numeric"
                style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
              />

              <Text style={[styles.inputLabel, { color: c.label }]}>Priority</Text>
              <View style={[styles.chipRow, { marginBottom: 14 }]}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setEditPriority(p)}
                    style={[
                      styles.priorityChip,
                      { backgroundColor: editPriority === p ? c.primary : c.background, borderColor: editPriority === p ? c.primary : c.border },
                    ]}
                  >
                    <Text style={{ color: editPriority === p ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "800" }}>
                      {PRIORITY_META[p].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.label }]}>Notes</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Optional notes"
                placeholderTextColor={c.mutedForeground}
                style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
              />

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={isMutating}
                style={[styles.primaryBtn, { backgroundColor: c.primary, opacity: isMutating ? 0.6 : 1 }]}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color={c.primaryForeground} size="small" />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 15 }}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteFromEdit}
                disabled={isMutating}
                style={[styles.deleteBtn, { borderColor: c.danger, opacity: isMutating ? 0.5 : 1 }]}
              >
                <Feather name="trash-2" size={15} color={c.danger} />
                <Text style={{ color: c.danger, fontWeight: "700", fontSize: 14 }}>Remove from Wantlist</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

type RowColors = ReturnType<typeof useColors>;

const WantRow = memo(function WantRow({
  item,
  onPress,
  onAcquire,
  c,
}: {
  item: WantlistItem;
  onPress: (item: WantlistItem) => void;
  onAcquire: (item: WantlistItem) => void;
  c: RowColors;
}) {
  const meta = PRIORITY_META[item.priority];
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.rowAvatar, { backgroundColor: c.background }]}>
        <Feather name="bookmark" size={16} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{item.cardName}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Pill label={item.targetGrade} variant="teal" />
          <Pill label={meta.label} variant={meta.variant} />
        </View>
        {item.notes ? (
          <Text style={[styles.rowSub, { color: c.mutedForeground, marginTop: 4 }]} numberOfLines={1}>{item.notes}</Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={{ color: c.secondary, fontWeight: "900", fontSize: 14 }}>
          ${item.maxPrice.toLocaleString()}
        </Text>
        <TouchableOpacity
          onPress={() => onAcquire(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.acquireBtn, { borderColor: c.secondary }]}
        >
          <Feather name="check" size={12} color={c.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const AcquiredRow = memo(function AcquiredRow({
  item,
  onDelete,
  c,
}: {
  item: WantlistItem;
  onDelete: (id: string) => void;
  c: RowColors;
}) {
  return (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border, opacity: 0.55 }]}>
      <View style={[styles.rowAvatar, { backgroundColor: c.background }]}>
        <Feather name="check-circle" size={16} color={c.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text, textDecorationLine: "line-through" }]} numberOfLines={1}>
          {item.cardName}
        </Text>
        <Text style={[styles.rowSub, { color: c.mutedForeground, marginTop: 2 }]}>
          {item.targetGrade} · ${item.maxPrice.toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Feather name="x" size={16} color={c.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  backBtn: { width: 32, height: 38, alignItems: "center", justifyContent: "center", marginLeft: -6 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -1, marginTop: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16 },
  emptyText: { textAlign: "center", marginTop: 64, fontSize: 14 },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: "center", gap: 10, marginTop: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  emptySub: { fontSize: 12, textAlign: "center", lineHeight: 18, marginBottom: 4 },
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  rowAvatar: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 13, fontWeight: "700" },
  rowSub: { fontSize: 11 },
  acquireBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hintText: { textAlign: "center", fontSize: 11, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  editCardName: { fontSize: 13, marginBottom: 18, marginTop: -10 },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 14 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  priorityChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  primaryBtn: { borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center", marginTop: 6 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, height: 46, borderWidth: 1, marginTop: 10 },
});
