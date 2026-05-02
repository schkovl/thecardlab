import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { ClipboardList, Plus, X, Loader2, Pencil, CheckCircle2, Clock, Package, Truck } from "lucide-react";
import { useState } from "react";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import {
  useListGradingSubmissions,
  useCreateGradingSubmission,
  useUpdateGradingSubmission,
  useDeleteGradingSubmission,
  getListGradingSubmissionsQueryKey,
  type GradingSubmission,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const GRADERS = ["PSA", "BGS", "SGC", "CGC"] as const;
const SERVICE_LEVELS: Record<string, string[]> = {
  PSA: ["Economy", "Value", "Regular", "Express", "Super Express", "Walk-Through"],
  BGS: ["Economy", "Standard", "Express", "Premium"],
  SGC: ["Economy", "Standard", "Express", "Super Express"],
  CGC: ["Economy", "Standard", "Express"],
};
const STATUSES = ["pending", "in-grading", "graded", "shipped", "completed"] as const;
type Status = typeof STATUSES[number];

const STATUS_META: Record<Status, { label: string; color: "cyan" | "teal" | "violet" | "gold"; icon: React.ComponentType<{ size?: number }> }> = {
  "pending":    { label: "Pending",    color: "violet", icon: Clock },
  "in-grading": { label: "In Grading", color: "gold",   icon: ClipboardList },
  "graded":     { label: "Graded",     color: "teal",   icon: CheckCircle2 },
  "shipped":    { label: "Shipped",    color: "cyan",   icon: Truck },
  "completed":  { label: "Completed",  color: "teal",   icon: Package },
};

const EMPTY_FORM = { cardName: "", grader: "PSA" as typeof GRADERS[number], serviceLevel: "Economy", declaredValue: "", submittedDate: "", notes: "" };

export default function GradingTracker() {
  const { isSignedIn, isLoaded } = useUser();
  const qc = useQueryClient();

  const { data: submissions = [], isLoading } = useListGradingSubmissions({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getListGradingSubmissionsQueryKey() },
  });

  const createMutation = useCreateGradingSubmission({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGradingSubmissionsQueryKey() });
        toast.success("Submission logged");
        setShowAdd(false);
        setForm(EMPTY_FORM);
      },
      onError: () => toast.error("Failed to log submission"),
    },
  });

  const updateMutation = useUpdateGradingSubmission({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGradingSubmissionsQueryKey() });
        toast.success("Submission updated");
        setEditingId(null);
      },
      onError: () => toast.error("Failed to update submission"),
    },
  });

  const deleteMutation = useDeleteGradingSubmission({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGradingSubmissionsQueryKey() });
        toast.success("Submission removed");
      },
      onError: () => toast.error("Failed to remove submission"),
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Status>("pending");
  const [editGrade, setEditGrade] = useState("");
  const [editCert, setEditCert] = useState("");
  const [editReturnDate, setEditReturnDate] = useState("");

  const openEdit = (s: typeof submissions[number]) => {
    setEditingId(s.id);
    setEditStatus(s.status as Status);
    setEditGrade(s.gradeReceived ?? "");
    setEditCert(s.certNumber ?? "");
    setEditReturnDate(s.returnedDate ?? "");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cardName || !form.grader || !form.serviceLevel) {
      toast.error("Card name, grader, and service level are required");
      return;
    }
    createMutation.mutate({
      data: {
        cardName: form.cardName,
        grader: form.grader,
        serviceLevel: form.serviceLevel,
        declaredValue: form.declaredValue ? parseInt(form.declaredValue, 10) : undefined,
        submittedDate: form.submittedDate || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        status: editStatus,
        gradeReceived: editGrade || undefined,
        certNumber: editCert || undefined,
        returnedDate: editReturnDate || undefined,
      },
    });
  };

  const inProgress = submissions.filter((s) => !["completed", "graded"].includes(s.status));
  const completed  = submissions.filter((s) => ["completed", "graded"].includes(s.status));

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Submissions</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Grading Tracker</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Track every card you send to PSA, BGS, SGC, and CGC — from submission to cert number.
          </p>
        </div>
        {isSignedIn && (
          <button
            onClick={() => setShowAdd(true)}
            className="h-10 px-5 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Log Submission
          </button>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Log Grading Submission</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Card Name *</label>
                <input
                  value={form.cardName}
                  onChange={(e) => setForm((f) => ({ ...f, cardName: e.target.value }))}
                  placeholder="e.g. 2023 Prizm Wembanyama Silver RC"
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Grader *</label>
                  <select
                    value={form.grader}
                    onChange={(e) => setForm((f) => ({ ...f, grader: e.target.value as typeof GRADERS[number], serviceLevel: SERVICE_LEVELS[e.target.value]?.[0] ?? "Economy" }))}
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {GRADERS.map((g) => <option key={g} value={g} className="bg-[#0d1a31]">{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Service Level *</label>
                  <select
                    value={form.serviceLevel}
                    onChange={(e) => setForm((f) => ({ ...f, serviceLevel: e.target.value }))}
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {(SERVICE_LEVELS[form.grader] ?? []).map((s) => <option key={s} value={s} className="bg-[#0d1a31]">{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Declared Value ($)</label>
                  <input
                    type="number" min="0"
                    value={form.declaredValue}
                    onChange={(e) => setForm((f) => ({ ...f, declaredValue: e.target.value }))}
                    placeholder="0"
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Submitted Date</label>
                  <input
                    type="date"
                    value={form.submittedDate}
                    onChange={(e) => setForm((f) => ({ ...f, submittedDate: e.target.value }))}
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                Log Submission
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Update status modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Update Status</h2>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Status)}
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {STATUSES.map((s) => <option key={s} value={s} className="bg-[#0d1a31]">{STATUS_META[s].label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Grade Received</label>
                  <input
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    placeholder="e.g. PSA 9"
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Cert Number</label>
                  <input
                    value={editCert}
                    onChange={(e) => setEditCert(e.target.value)}
                    placeholder="123456789"
                    className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Return Date</label>
                <input
                  type="date"
                  value={editReturnDate}
                  onChange={(e) => setEditReturnDate(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {!isLoaded || isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : !isSignedIn ? (
        <HoloCard className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sign in to track your grading submissions
        </HoloCard>
      ) : submissions.length === 0 ? (
        <HoloCard className="flex flex-col items-center justify-center h-64 gap-3">
          <ClipboardList size={40} className="text-primary/40" />
          <p className="text-muted-foreground font-bold">No submissions yet</p>
          <p className="text-sm text-muted-foreground/60 text-center max-w-xs">Log your first card to PSA, BGS, SGC, or CGC and track it all the way through.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-primary hover:underline font-bold text-sm">Log your first submission</button>
        </HoloCard>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">In Progress — {inProgress.length}</h2>
              <HoloCard className="p-0 overflow-hidden">
                <SubmissionTable submissions={inProgress} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate({ id })} />
              </HoloCard>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Completed — {completed.length}</h2>
              <HoloCard className="p-0 overflow-hidden">
                <SubmissionTable submissions={completed} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate({ id })} />
              </HoloCard>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

function SubmissionTable({
  submissions,
  onEdit,
  onDelete,
}: {
  submissions: GradingSubmission[];
  onEdit: (s: GradingSubmission) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-b border-border bg-white/5">
            <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Card</th>
            <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Grader</th>
            <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Service</th>
            <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Status</th>
            <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Grade / Cert</th>
            <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Submitted</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {submissions.map((s) => {
            const meta = STATUS_META[s.status as Status] ?? STATUS_META["pending"];
            return (
              <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                <td className="py-3 px-4 font-medium max-w-[200px] truncate">{s.cardName}</td>
                <td className="py-3 px-4">
                  <span className="font-black text-xs text-primary">{s.grader}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{s.serviceLevel}</td>
                <td className="py-3 px-4">
                  <Pill variant={meta.color}>{meta.label}</Pill>
                </td>
                <td className="py-3 px-4">
                  {s.gradeReceived ? (
                    <div>
                      <div className="font-bold text-secondary">{s.gradeReceived}</div>
                      {s.certNumber && <div className="text-xs text-muted-foreground">#{s.certNumber}</div>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-muted-foreground text-xs">{s.submittedDate ?? "—"}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(s)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
