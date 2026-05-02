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
  useListGradingSubmissions,
  useCreateGradingSubmission,
  useUpdateGradingSubmission,
  useDeleteGradingSubmission,
  getListGradingSubmissionsQueryKey,
  GradingSubmission,
  GradingSubmissionGrader,
  GradingSubmissionStatus,
} from "@workspace/api-client-react";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GRADERS: GradingSubmissionGrader[] = ["PSA", "BGS", "SGC", "CGC"];
const SERVICE_LEVELS: Record<GradingSubmissionGrader, string[]> = {
  PSA: ["Economy", "Value", "Regular", "Express", "Super Express", "Walk-Through"],
  BGS: ["Economy", "Standard", "Express", "Premium"],
  SGC: ["Economy", "Standard", "Express", "Super Express"],
  CGC: ["Economy", "Standard", "Express"],
};
const STATUSES: GradingSubmissionStatus[] = ["pending", "in-grading", "graded", "shipped", "completed"];

type StatusVariant = "violet" | "gold" | "teal" | "cyan";
const STATUS_META: Record<GradingSubmissionStatus, { label: string; variant: StatusVariant }> = {
  "pending":    { label: "Pending",    variant: "violet" },
  "in-grading": { label: "In Grading", variant: "gold"   },
  "graded":     { label: "Graded",     variant: "teal"   },
  "shipped":    { label: "Shipped",    variant: "cyan"   },
  "completed":  { label: "Completed",  variant: "teal"   },
};

type SubmissionsContext = { previousSubmissions: GradingSubmission[] | undefined };

export default function GradingTrackerScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [cardName, setCardName] = useState("");
  const [grader, setGrader] = useState<GradingSubmissionGrader>("PSA");
  const [serviceLevel, setServiceLevel] = useState("Economy");
  const [declaredValue, setDeclaredValue] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [editItem, setEditItem] = useState<GradingSubmission | null>(null);
  const [editStatus, setEditStatus] = useState<GradingSubmissionStatus>("pending");
  const [editGrade, setEditGrade] = useState("");
  const [editCert, setEditCert] = useState("");
  const [editReturnDate, setEditReturnDate] = useState("");

  const { data: submissions = [], isLoading, refetch, isRefetching } = useListGradingSubmissions({
    query: { enabled: !!isSignedIn, queryKey: getListGradingSubmissionsQueryKey() },
  });

  const resetAddForm = () => {
    setCardName("");
    setGrader("PSA");
    setServiceLevel("Economy");
    setDeclaredValue("");
    setSubmittedDate("");
    setNotes("");
  };

  const createMutation = useCreateGradingSubmission({
    mutation: {
      onMutate: async ({ data }): Promise<SubmissionsContext> => {
        await qc.cancelQueries({ queryKey: getListGradingSubmissionsQueryKey() });
        const previousSubmissions = qc.getQueryData<GradingSubmission[]>(getListGradingSubmissionsQueryKey());
        const optimistic: GradingSubmission = {
          id: `temp-${Date.now()}`,
          cardName: data.cardName,
          grader: data.grader,
          serviceLevel: data.serviceLevel,
          declaredValue: data.declaredValue ?? null,
          submittedDate: data.submittedDate ?? null,
          returnedDate: null,
          certNumber: null,
          status: "pending",
          gradeReceived: null,
          notes: data.notes ?? null,
          createdAt: new Date().toISOString(),
        };
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        qc.setQueryData<GradingSubmission[]>(
          getListGradingSubmissionsQueryKey(),
          (old) => [optimistic, ...(old ?? [])]
        );
        return { previousSubmissions };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as SubmissionsContext | undefined;
        if (ctx?.previousSubmissions !== undefined) {
          qc.setQueryData(getListGradingSubmissionsQueryKey(), ctx.previousSubmissions);
        }
        Alert.alert("Error", "Failed to log submission");
      },
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdd(false);
        resetAddForm();
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: getListGradingSubmissionsQueryKey() });
      },
    },
  });

  const updateMutation = useUpdateGradingSubmission({
    mutation: {
      onMutate: async ({ id, data }): Promise<SubmissionsContext> => {
        await qc.cancelQueries({ queryKey: getListGradingSubmissionsQueryKey() });
        const previousSubmissions = qc.getQueryData<GradingSubmission[]>(getListGradingSubmissionsQueryKey());
        qc.setQueryData<GradingSubmission[]>(
          getListGradingSubmissionsQueryKey(),
          (old) =>
            (old ?? []).map((s) => {
              if (s.id !== id) return s;
              return {
                ...s,
                status: data.status ?? s.status,
                gradeReceived: data.gradeReceived !== undefined ? data.gradeReceived : s.gradeReceived,
                certNumber: data.certNumber !== undefined ? data.certNumber : s.certNumber,
                returnedDate: data.returnedDate !== undefined ? data.returnedDate : s.returnedDate,
              };
            })
        );
        return { previousSubmissions };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as SubmissionsContext | undefined;
        if (ctx?.previousSubmissions !== undefined) {
          qc.setQueryData(getListGradingSubmissionsQueryKey(), ctx.previousSubmissions);
        }
        Alert.alert("Error", "Failed to update submission");
      },
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditItem(null);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: getListGradingSubmissionsQueryKey() });
      },
    },
  });

  const deleteMutation = useDeleteGradingSubmission({
    mutation: {
      onMutate: async ({ id }): Promise<SubmissionsContext> => {
        await qc.cancelQueries({ queryKey: getListGradingSubmissionsQueryKey() });
        const previousSubmissions = qc.getQueryData<GradingSubmission[]>(getListGradingSubmissionsQueryKey());
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        qc.setQueryData<GradingSubmission[]>(
          getListGradingSubmissionsQueryKey(),
          (old) => (old ?? []).filter((s) => s.id !== id)
        );
        return { previousSubmissions };
      },
      onError: (_err, _vars, context) => {
        const ctx = context as SubmissionsContext | undefined;
        if (ctx?.previousSubmissions !== undefined) {
          qc.setQueryData(getListGradingSubmissionsQueryKey(), ctx.previousSubmissions);
        }
        Alert.alert("Error", "Failed to remove submission");
      },
      onSuccess: () => {
        setEditItem(null);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: getListGradingSubmissionsQueryKey() });
      },
    },
  });

  const handleAdd = () => {
    if (!cardName.trim()) {
      Alert.alert("Missing Info", "Card name is required");
      return;
    }
    createMutation.mutate({
      data: {
        cardName: cardName.trim(),
        grader,
        serviceLevel,
        declaredValue: declaredValue ? parseInt(declaredValue, 10) : undefined,
        submittedDate: submittedDate || undefined,
        notes: notes.trim() || undefined,
      },
    });
  };

  const openEdit = useCallback((s: GradingSubmission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditItem(s);
    setEditStatus(s.status);
    setEditGrade(s.gradeReceived ?? "");
    setEditCert(s.certNumber ?? "");
    setEditReturnDate(s.returnedDate ?? "");
  }, []);

  const handleSaveEdit = () => {
    if (!editItem) return;
    updateMutation.mutate({
      id: editItem.id,
      data: {
        status: editStatus,
        gradeReceived: editGrade.trim() || undefined,
        certNumber: editCert.trim() || undefined,
        returnedDate: editReturnDate || undefined,
      },
    });
  };

  const handleDeleteFromEdit = () => {
    if (!editItem) return;
    Alert.alert("Remove Submission", `Remove "${editItem.cardName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: editItem.id }),
      },
    ]);
  };

  const { inProgress, completed } = useMemo(() => {
    return {
      inProgress: submissions.filter((s) => !["completed", "graded"].includes(s.status)),
      completed: submissions.filter((s) => ["completed", "graded"].includes(s.status)),
    };
  }, [submissions]);

  const isMutating = updateMutation.isPending || deleteMutation.isPending;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.primary }]}>SUBMISSIONS</Text>
          <Text style={[styles.title, { color: c.text }]}>Grading Tracker</Text>
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
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Sign in to track your grading submissions</Text>
        ) : isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} />
        ) : submissions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Feather name="clipboard" size={40} color={c.primary} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No submissions yet</Text>
            <Text style={[styles.emptySub, { color: c.mutedForeground }]}>
              Log your first card to PSA, BGS, SGC, or CGC and track it through the pipeline.
            </Text>
            <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.emptyBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 14 }}>Log First Submission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {inProgress.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <SectionHeader title={`In Progress — ${inProgress.length}`} />
                {inProgress.map((s) => (
                  <SubmissionRow key={s.id} item={s} onPress={openEdit} c={c} />
                ))}
              </View>
            )}
            {completed.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <SectionHeader title={`Completed — ${completed.length}`} />
                {completed.map((s) => (
                  <SubmissionRow key={s.id} item={s} onPress={openEdit} c={c} />
                ))}
              </View>
            )}
            <Text style={[styles.hintText, { color: c.mutedForeground }]}>Tap a submission to update status</Text>
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
                <Text style={[styles.modalTitle, { color: c.text }]}>Log Submission</Text>
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

              <Text style={[styles.inputLabel, { color: c.label }]}>Grader</Text>
              <View style={styles.chipRow}>
                {GRADERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => {
                      setGrader(g);
                      setServiceLevel(SERVICE_LEVELS[g][0]);
                    }}
                    style={[
                      styles.chip,
                      { backgroundColor: grader === g ? c.primary : c.background, borderColor: grader === g ? c.primary : c.border },
                    ]}
                  >
                    <Text style={{ color: grader === g ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "800" }}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.label, marginTop: 14 }]}>Service Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {SERVICE_LEVELS[grader].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setServiceLevel(s)}
                      style={[
                        styles.chip,
                        { backgroundColor: serviceLevel === s ? c.primary : c.background, borderColor: serviceLevel === s ? c.primary : c.border },
                      ]}
                    >
                      <Text style={{ color: serviceLevel === s ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: c.label }]}>Declared Value ($)</Text>
                  <TextInput
                    value={declaredValue}
                    onChangeText={setDeclaredValue}
                    placeholder="0"
                    placeholderTextColor={c.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: c.label }]}>Submitted (YYYY-MM-DD)</Text>
                  <TextInput
                    value={submittedDate}
                    onChangeText={setSubmittedDate}
                    placeholder="2026-01-15"
                    placeholderTextColor={c.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: c.label }]}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes"
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
                  <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 15 }}>Log Submission</Text>
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
                <Text style={[styles.modalTitle, { color: c.text }]}>Update Status</Text>
                <TouchableOpacity onPress={() => setEditItem(null)}>
                  <Feather name="x" size={22} color={c.mutedForeground} />
                </TouchableOpacity>
              </View>

              {editItem && (
                <Text style={[styles.editCardName, { color: c.mutedForeground }]} numberOfLines={1}>
                  {editItem.cardName} · {editItem.grader} {editItem.serviceLevel}
                </Text>
              )}

              <Text style={[styles.inputLabel, { color: c.label }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {STATUSES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setEditStatus(s)}
                      style={[
                        styles.chip,
                        { backgroundColor: editStatus === s ? c.primary : c.background, borderColor: editStatus === s ? c.primary : c.border },
                      ]}
                    >
                      <Text style={{ color: editStatus === s ? c.primaryForeground : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>
                        {STATUS_META[s].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: c.label }]}>Grade Received</Text>
                  <TextInput
                    value={editGrade}
                    onChangeText={setEditGrade}
                    placeholder="e.g. PSA 9"
                    placeholderTextColor={c.mutedForeground}
                    style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: c.label }]}>Cert #</Text>
                  <TextInput
                    value={editCert}
                    onChangeText={setEditCert}
                    placeholder="123456789"
                    placeholderTextColor={c.mutedForeground}
                    style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: c.input }]}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: c.label }]}>Returned Date (YYYY-MM-DD)</Text>
              <TextInput
                value={editReturnDate}
                onChangeText={setEditReturnDate}
                placeholder="2026-02-15"
                placeholderTextColor={c.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
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
                <Text style={{ color: c.danger, fontWeight: "700", fontSize: 14 }}>Remove Submission</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

type RowColors = ReturnType<typeof useColors>;

const SubmissionRow = memo(function SubmissionRow({
  item,
  onPress,
  c,
}: {
  item: GradingSubmission;
  onPress: (s: GradingSubmission) => void;
  c: RowColors;
}) {
  const meta = STATUS_META[item.status];
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.rowAvatar, { backgroundColor: c.background }]}>
        <Text style={{ color: c.primary, fontWeight: "900", fontSize: 11 }}>{item.grader}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{item.cardName}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Pill label={meta.label} variant={meta.variant} />
          <Text style={[styles.rowSub, { color: c.mutedForeground }]} numberOfLines={1}>
            {item.serviceLevel}
            {item.declaredValue ? ` · $${item.declaredValue}` : ""}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {item.gradeReceived ? (
          <Text style={{ color: c.secondary, fontWeight: "900", fontSize: 14 }}>{item.gradeReceived}</Text>
        ) : (
          <Feather name="chevron-right" size={18} color={c.mutedForeground} />
        )}
        {item.certNumber ? (
          <Text style={{ color: c.mutedForeground, fontSize: 10, marginTop: 2 }}>#{item.certNumber}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
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
  rowSub: { fontSize: 11, flex: 1 },
  hintText: { textAlign: "center", fontSize: 11, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  editCardName: { fontSize: 13, marginBottom: 18, marginTop: -10 },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 14 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  primaryBtn: { borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center", marginTop: 6 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, height: 46, borderWidth: 1, marginTop: 10 },
});
