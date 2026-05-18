import { useState } from "react";
import { Search, Mail, MessageCircle, BookOpen, ChevronDown } from "lucide-react";

const faqs = [
  {
    cat: "Getting started",
    items: [
      { q: "How accurate is Grade Lab?", a: "Our model averages within 0.5 of the eventual PSA outcome on a held-out validation set. Accuracy is highest with sharp, well-lit images of modern cards." },
      { q: "Which graders do you predict?", a: "PSA, BGS, SGC and CGC. We surface the most likely grade per company plus a confidence score." },
      { q: "Do you support Pokémon and soccer?", a: "Yes. Our training set spans baseball, basketball, football, hockey, soccer, Pokémon TCG and Magic: The Gathering." },
    ],
  },
  {
    cat: "Billing",
    items: [
      { q: "How do I cancel?", a: "Settings → Billing → Cancel. Stays active until end of paid period." },
      { q: "Do you offer refunds?", a: "On a case-by-case basis. Email support@thecardlab.app within 14 days of charge." },
      { q: "Is there a free tier?", a: "Yes. 3 free Grade Lab scans per month and unlimited portfolio tracking on Free." },
    ],
  },
  {
    cat: "Account",
    items: [
      { q: "Can I delete my data?", a: "Settings → Privacy → Delete account. Removes everything within 30 days." },
      { q: "How do I change my email?", a: "Settings → Profile → Email. We'll send a verification link to the new address." },
    ],
  },
  {
    cat: "Vault",
    items: [
      { q: "How is the vault insured?", a: "Lloyd's of London policy up to $25M per parcel. Each card is photographed on intake." },
      { q: "Are intra-vault trades taxed?", a: "Trades between vault accounts are not subject to sales tax in our operating jurisdiction. Consult your tax advisor." },
    ],
  },
];

export default function Support() {
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<string | null>(null);

  const filtered = query
    ? faqs.map((c) => ({ ...c, items: c.items.filter((i) => (i.q + i.a).toLowerCase().includes(query.toLowerCase())) })).filter((c) => c.items.length)
    : faqs;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-black mb-2">Help & support</h1>
      <p className="text-sm text-muted-foreground mb-8">We typically reply within 24 hours.</p>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles…"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#050914] border border-border text-sm focus:outline-none focus:border-primary/60"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <ContactCard icon={Mail} label="Email" sub="support@thecardlab.app" href="mailto:support@thecardlab.app" />
        <ContactCard icon={MessageCircle} label="Live chat" sub="Mon–Fri, 9-5 ET" href="#chat" />
        <ContactCard icon={BookOpen} label="Docs" sub="thecardlab.app/docs" href="/docs" />
      </div>

      {filtered.map((cat) => (
        <div key={cat.cat} className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">{cat.cat}</h2>
          <div className="rounded-2xl border border-border bg-[#0d1a31] divide-y divide-border">
            {cat.items.map((item) => {
              const key = `${cat.cat}-${item.q}`;
              const open = openIdx === key;
              return (
                <button
                  key={key}
                  onClick={() => setOpenIdx(open ? null : key)}
                  className="w-full text-left p-4 hover:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{item.q}</div>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </div>
                  {open && <p className="mt-2 text-xs leading-relaxed text-foreground/70">{item.a}</p>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactCard({ icon: Icon, label, sub, href }: { icon: React.ComponentType<{ size: number; className: string }>; label: string; sub: string; href: string }) {
  return (
    <a href={href} className="rounded-2xl border border-border bg-[#0d1a31] p-4 hover:border-primary/40 transition-colors">
      <Icon size={18} className="text-primary mb-2" />
      <div className="text-sm font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </a>
  );
}
