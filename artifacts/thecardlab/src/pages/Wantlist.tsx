import { Shell } from "@/components/layout/Shell";
import { HoloCard } from "@/components/cards/HoloCard";
import { Pill } from "@/components/cards/Pill";
import { BookmarkPlus, Plus, X, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { useState } from "react";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import {
  useListWantlistItems,
  useCreateWantlistItem,
  useUpdateWantlistItem,
  useDeleteWantlistItem,
  getListWantlistItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const GRADES = ["Raw", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5", "SGC 10"];
const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = typeof PRIORITIES[number];

const PRIORITY_META: Record<Priority, { label: string; color: "cyan" | "teal" | "violet" | "gold" }> = {
  high:   { label: "High",   color: "cyan"   },
  medium: { label: "Medium", color: "violet" },
  low:    { label: "Low",    color: "gold"   },
};

const EMPTY_FORM = { cardName: "", targetGrade: "PSA 9", maxPrice: "", priority: "medium" as Priority, notes: "" };

export default function Wantlist() {
  const { isSignedIn, isLoaded } = useUser();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useListWantlistItems({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getListWantlistItemsQueryKey() },
  });

  const createMutation = useCreateWantlistItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWantlistItemsQueryKey() });
        toast.success("Added to wantlist");
        setShowAdd(false);
        setForm(EMPTY_FORM);
      },
      onError: () => toast.error("Failed to add item"),
    },
  });

  const updateMutation = useUpdateWantlistItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWantlistItemsQueryKey() });
        toast.success("Wantlist updated");
        setEditingId(null);
      },
      onError: () => toast.error("Failed to update item"),
    },
  });

  const deleteMutation = useDeleteWantlistItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWantlistItemsQueryKey() });
        toast.success("Removed from wantlist");
      },
      onError: () => toast.error("Failed to remove item"),
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const openEdit = (item: typeof items[number]) => {
    setEditingId(item.id);
    setEditForm({
      cardName: item.cardName,
      targetGrade: item.targetGrade,
      maxPrice: String(item.maxPrice),
      priority: item.priority as Priority,
      notes: item.notes ?? "",
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cardName || !form.maxPrice) {
      toast.error("Card name and max price are required");
      return;
    }
    const price = parseInt(form.maxPrice, 10);
    if (isNaN(price) || price < 0) {
      toast.error("Max price must be a positive number");
      return;
    }
    createMutation.mutate({
      data: {
        cardName: form.cardName,
        targetGrade: form.targetGrade,
        maxPrice: price,
        priority: form.priority,
        notes: form.notes || undefined,
      },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const price = parseInt(editForm.maxPrice, 10);
    if (isNaN(price) || price < 0) {
      toast.error("Max price must be a positive number");
      return;
    }
    updateMutation.mutate({
      id: editingId,
      data: {
        cardName: editForm.cardName,
        targetGrade: editForm.targetGrade,
        maxPrice: price,
        priority: editForm.priority,
        notes: editForm.notes || undefined,
      },
    });
  };

  const markAcquired = (id: string) => {
    updateMutation.mutate({ id, data: { acquired: true } });
  };

  const active   = items.filter((i) => !i.acquired);
  const acquired = items.filter((i) => i.acquired);

  return (
    <Shell>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary tracking-[0.16em] uppercase font-black mb-1">Collection</div>
          <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Wantlist</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Track cards you're hunting with target grades and max buy prices. Never overpay again.
          </p>
        </div>
        {isSignedIn && (
          <button
            onClick={() => setShowAdd(true)}
            className="h-10 px-5 rounded-xl bg-white/5 border border-border text-foreground font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Card
          </button>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add to Wantlist</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <WantlistForm
              form={form}
              setForm={setForm}
              onSubmit={handleAdd}
              isPending={createMutation.isPending}
              submitLabel="Add to Wantlist"
            />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1a31] border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Edit Wantlist Item</h2>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <WantlistForm
              form={editForm}
              setForm={setEditForm}
              onSubmit={handleEdit}
              isPending={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      )}

      {!isLoaded || isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : !isSignedIn ? (
        <HoloCard className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sign in to manage your wantlist
        </HoloCard>
      ) : items.length === 0 ? (
        <HoloCard className="flex flex-col items-center justify-center h-64 gap-3">
          <BookmarkPlus size={40} className="text-primary/40" />
          <p className="text-muted-foreground font-bold">Your wantlist is empty</p>
          <p className="text-sm text-muted-foreground/60 text-center max-w-xs">Add cards you're hunting so you always know your max buy price.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-primary hover:underline font-bold text-sm">Add your first card</button>
        </HoloCard>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Hunting — {active.length}</h2>
              <HoloCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-white/5">
                        <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Card</th>
                        <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Target Grade</th>
                        <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Max Buy Price</th>
                        <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Priority</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {active.sort((a, b) => {
                        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
                        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
                      }).map((item) => {
                        const pMeta = PRIORITY_META[item.priority as Priority] ?? PRIORITY_META.medium;
                        return (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                            <td className="py-3 px-4">
                              <div className="font-medium">{item.cardName}</div>
                              {item.notes && <div className="text-xs text-muted-foreground mt-0.5">{item.notes}</div>}
                            </td>
                            <td className="py-3 px-4">
                              <Pill variant="teal">{item.targetGrade}</Pill>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-secondary">${item.maxPrice.toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <Pill variant={pMeta.color}>{pMeta.label}</Pill>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => markAcquired(item.id)}
                                  className="text-muted-foreground hover:text-secondary transition-colors"
                                  title="Mark as acquired"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                                <button onClick={() => openEdit(item)} className="text-muted-foreground hover:text-primary transition-colors">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => deleteMutation.mutate({ id: item.id })} className="text-muted-foreground hover:text-destructive transition-colors">
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
              </HoloCard>
            </div>
          )}

          {acquired.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Acquired — {acquired.length}</h2>
              <HoloCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-white/5">
                        <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Card</th>
                        <th className="text-left font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Target Grade</th>
                        <th className="text-right font-black text-xs text-muted-foreground uppercase tracking-wider py-3 px-4">Max Buy Price</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {acquired.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors group opacity-60">
                          <td className="py-3 px-4 font-medium line-through">{item.cardName}</td>
                          <td className="py-3 px-4 text-muted-foreground">{item.targetGrade}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">${item.maxPrice.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => deleteMutation.mutate({ id: item.id })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </HoloCard>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

function WantlistForm({
  form,
  setForm,
  onSubmit,
  isPending,
  submitLabel,
}: {
  form: { cardName: string; targetGrade: string; maxPrice: string; priority: Priority; notes: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Grade</label>
          <select
            value={form.targetGrade}
            onChange={(e) => setForm((f) => ({ ...f, targetGrade: e.target.value }))}
            className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            {GRADES.map((g) => <option key={g} value={g} className="bg-[#0d1a31]">{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Max Buy Price ($) *</label>
          <input
            type="number" min="0"
            value={form.maxPrice}
            onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
            placeholder="0"
            className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Priority</label>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setForm((f) => ({ ...f, priority: p }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                form.priority === p
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-white/5 text-muted-foreground hover:text-white"
              }`}
            >
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Notes</label>
        <input
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="e.g. Rookie year only, prefer centered"
          className="w-full h-10 bg-white/5 border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-10 rounded-xl bg-gradient-to-br from-primary to-[#00bcd4] text-[#03111c] font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitLabel}
      </button>
    </form>
  );
}
