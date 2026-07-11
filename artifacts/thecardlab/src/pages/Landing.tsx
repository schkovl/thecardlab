import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SignInButton, SignUpButton, useAuth } from "@/lib/auth";
import { Redirect, Link } from "wouter";
import {
  FlaskConical, ScanLine, LayoutGrid, ShieldCheck, Zap, TrendingUp,
  Star, ArrowRight, ChevronRight, ClipboardList, BookmarkPlus,
  CheckCircle2, BarChart3, AlertTriangle, Search, ShoppingCart, Smartphone,
} from "lucide-react";
import wembyImg from "@/assets/cards/wemby.webp";
import mahomesImg from "@/assets/cards/mahomes.webp";
import charizardImg from "@/assets/cards/charizard.webp";
import ohtaniImg from "@/assets/cards/ohtani.webp";
import herbertImg from "@/assets/cards/herbert.webp";
import lawrenceImg from "@/assets/cards/lawrence.webp";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Shared Mockup Primitives ──────────────────────────────────────────────

const MOCK_ACCENT: Record<string, string> = {
  Dashboard: "#00e5ff",
  "Deal Screener": "#22d3a6",
  "Grade Lab": "#f97316",
  "Portfolio & Comps": "#a78bfa",
  "Research & Alerts": "#38bdf8",
};

const MOCK_NAV = [
  { label: "Dashboard",        icon: BarChart3    },
  { label: "Deal Screener",    icon: ScanLine     },
  { label: "Grade Lab",        icon: FlaskConical },
  { label: "Portfolio & Comps",icon: LayoutGrid   },
  { label: "Research & Alerts",icon: TrendingUp   },
  { label: "Marketplace",      icon: Star         },
  { label: "Global Vault",     icon: ShieldCheck  },
  { label: "Grading Tracker",  icon: ClipboardList},
  { label: "Wantlist",         icon: BookmarkPlus },
];

function MockTopBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#0b1220", borderBottom: "1px solid #1e3a5f40" }}>
      <div style={{ flex: 1, height: 22, borderRadius: 5, background: "#131c2e", border: "1px solid #1e3a5f50", display: "flex", alignItems: "center", paddingLeft: 7, gap: 4 }}>
        <Search size={7} style={{ color: "#475569" }} />
        <span style={{ fontSize: 7, color: "#475569" }}>Search cards, players, sets, PSA certs, or paste eBay URL...</span>
      </div>
      <div style={{ fontSize: 7, color: "#00e5ff", background: "#00e5ff12", border: "1px solid #00e5ff25", borderRadius: 4, padding: "2px 6px", fontWeight: 700, display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <Zap size={6} />AI Assistant
      </div>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 7, fontWeight: 900, color: "white" }}>M</span>
      </div>
    </div>
  );
}

function MockSidebar({ active }: { active: string }) {
  const accent = MOCK_ACCENT[active] ?? "#00e5ff";
  return (
    <div style={{ width: 118, background: "#0b1220", borderRight: "1px solid #1e3a5f35", padding: "8px 4px", display: "flex", flexDirection: "column", minHeight: 360 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 6px", marginBottom: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(135deg, #00e5ff, #00bcd4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FlaskConical size={9} style={{ color: "#03111c" }} />
        </div>
        <div>
          <div style={{ fontSize: 8.5, fontWeight: 900, color: "white", lineHeight: 1.1 }}>TheCardLab</div>
          <div style={{ fontSize: 6, color: "#00e5ff80", fontWeight: 700, letterSpacing: "0.06em" }}>COMMAND CENTER</div>
        </div>
      </div>
      {MOCK_NAV.map(({ label, icon: Icon }) => {
        const isActive = label === active;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3.5px 6px", borderRadius: 5, marginBottom: 1, background: isActive ? `${accent}15` : "transparent", border: isActive ? `1px solid ${accent}25` : "1px solid transparent" }}>
            <Icon size={8} style={{ color: isActive ? accent : "#475569", flexShrink: 0 }} />
            <span style={{ fontSize: 7.5, color: isActive ? "white" : "#64748b", fontWeight: isActive ? 700 : 400, lineHeight: 1 }}>{label}</span>
          </div>
        );
      })}
      <div style={{ marginTop: "auto", borderTop: "1px solid #1e3a5f30", paddingTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 6px", marginBottom: 4 }}>
          <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 7, fontWeight: 900, color: "white" }}>M</span>
          </div>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, color: "white", lineHeight: 1.2 }}>Member</div>
            <div style={{ fontSize: 6, color: "#64748b" }}>Free Plan</div>
          </div>
        </div>
        <div style={{ margin: "0 4px", padding: "3px 0", borderRadius: 4, background: "#00e5ff15", border: "1px solid #00e5ff30", textAlign: "center" }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: "#00e5ff" }}>Upgrade to Pro</span>
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  const scans = [
    { img: wembyImg,    name: "2023 Prizm Wembanyama Silver",  time: "Just now · Mint",      grade: "PSA 10", val: "$1,850 Est.", gc: "#00e5ff" },
    { img: herbertImg,  name: "2020 Prizm Justin Herbert RC",  time: "2h ago · Near Mint",   grade: "PSA 9",  val: "$420 Est.",  gc: "#94a3b8" },
    { img: charizardImg,name: "1999 Pokémon Base Charizard",   time: "5h ago · Excellent",   grade: "PSA 8",  val: "$1,200 Est.",gc: "#64748b" },
    { img: lawrenceImg, name: "2021 Select Trevor Lawrence",   time: "Yesterday · Mint",     grade: "PSA 10", val: "$350 Est.", gc: "#00e5ff" },
  ];
  return (
    <div className="relative select-none pointer-events-none">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-[#22d3a6]/5 rounded-3xl blur-xl" />
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded bg-[#0d1117]/80 border border-[#1e3a5f]/60 text-[9px] text-[#475569] font-semibold tracking-wide select-none pointer-events-none">Example data</div>
      <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]" style={{ background: "#0d1117" }}>
        <MockTopBar />
        <div style={{ display: "flex" }}>
          <MockSidebar active="Dashboard" />
          <div style={{ flex: 1, padding: "10px 12px", background: "#0d1117", minWidth: 0 }}>
            <div style={{ fontSize: 6.5, color: "#00e5ff", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>PHASE 1 · CORE PLATFORM</div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 2 }}>TheCardLab Dashboard</div>
                <div style={{ fontSize: 7, color: "#64748b", maxWidth: 270, lineHeight: 1.4 }}>Your complete AI-powered command center for sports card research, grading, and portfolio management.</div>
              </div>
              <div style={{ fontSize: 7, fontWeight: 800, color: "#0d1117", background: "#00e5ff", borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
                <Zap size={7} />Quick Scan
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 8 }}>
              {[
                { label: "TOTAL PORTFOLIO VALUE", value: "$278,420", sub: "▲ 12.4%  vs last 30 days", vc: "#22d3a6" },
                { label: "RAW OPPORTUNITIES",      value: "127",      sub: "+18 this week",           vc: "white"   },
                { label: "GRADING ROI",            value: "38.6%",    sub: "Example data only", vc: "#f59e0b" },
                { label: "AI ACCURACY",            value: "92.7%",    sub: "Example data only",        vc: "#00e5ff" },
              ].map(({ label, value, sub, vc }) => (
                <div key={label} style={{ background: "#131c2e", border: "1px solid #1e3a5f45", borderRadius: 7, padding: "7px 8px" }}>
                  <div style={{ fontSize: 6, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: vc, lineHeight: 1, marginBottom: 2 }}>{value}</div>
                  <div style={{ fontSize: 6, color: "#94a3b8" }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 128px", gap: 6 }}>
              <div style={{ background: "#131c2e", border: "1px solid #1e3a5f45", borderRadius: 7, padding: "7px 8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ fontSize: 6.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>RECENT AI SCANS</div>
                  <div style={{ fontSize: 6.5, color: "#00e5ff" }}>View All →</div>
                </div>
                {scans.map(({ img, name, time, grade, val, gc }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #1e3a5f25" }}>
                    <div style={{ width: 18, height: 24, borderRadius: 2, overflow: "hidden", background: "#0a1628", flexShrink: 0 }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{name}</div>
                      <div style={{ fontSize: 6, color: "#64748b" }}>{time}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 6.5, fontWeight: 800, color: gc, background: gc + "18", border: `1px solid ${gc}30`, borderRadius: 3, padding: "1px 4px", marginBottom: 1 }}>{grade}</div>
                      <div style={{ fontSize: 6, color: "#22d3a6", fontWeight: 700 }}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#131c2e", border: "1px solid #1e3a5f45", borderRadius: 7, padding: "7px 8px" }}>
                <div style={{ fontSize: 6.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>MARKET PULSE</div>
                <div style={{ background: "#0d1117", border: "1px solid #1e3a5f35", borderRadius: 5, padding: "6px 7px", marginBottom: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ fontSize: 6, color: "#64748b", fontWeight: 700 }}>TCL INDEX</div>
                    <div style={{ fontSize: 5.5, color: "#22d3a6", background: "#22d3a618", border: "1px solid #22d3a630", borderRadius: 3, padding: "1px 3px", fontWeight: 700 }}>BULLISH</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "white", lineHeight: 1, marginBottom: 1 }}>1,565</div>
                  <div style={{ fontSize: 7, color: "#22d3a6", fontWeight: 700 }}>▲ 3.2%</div>
                </div>
                {[["Volume (24h)", "$4.7M", "white"], ["Top Mover", "C. Flagg +11%", "#f59e0b"]].map(([k, v, c]) => (
                  <div key={k as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ fontSize: 6, color: "#64748b" }}>{k}</div>
                    <div style={{ fontSize: 6, color: c as string, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealScreenerMockup() {
  return (
    <div className="relative select-none pointer-events-none">
      <div className="absolute -inset-4 bg-gradient-to-br from-[#22d3a6]/8 via-transparent to-primary/5 rounded-3xl blur-xl" />
      <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]" style={{ background: "#0d1117" }}>
        <MockTopBar />
        <div style={{ display: "flex" }}>
          <MockSidebar active="Deal Screener" />
          <div style={{ flex: 1, padding: "10px 12px", background: "#0d1117", minWidth: 0 }}>
            <div style={{ fontSize: 6.5, color: "#22d3a6", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>AI-POWERED ANALYSIS</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 8 }}>Deal Screener</div>
            <div style={{ background: "#131c2e", border: "1px solid #22d3a640", borderRadius: 7, padding: "7px 10px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={9} style={{ color: "#22d3a6", flexShrink: 0 }} />
              <span style={{ fontSize: 7, color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>https://www.ebay.com/itm/2023-24-Panini-Prizm-Wembanyama-RC-136...</span>
              <div style={{ fontSize: 7, fontWeight: 800, color: "#0d1117", background: "#22d3a6", borderRadius: 4, padding: "2px 8px", flexShrink: 0 }}>Analyze →</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
              <div>
                <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 6, overflow: "hidden", background: "#0a1628", border: "1px solid #1e3a5f40", marginBottom: 5 }}>
                  <img src={wembyImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ fontSize: 7, fontWeight: 700, color: "white", lineHeight: 1.3, marginBottom: 2 }}>2023-24 Prizm Wembanyama Silver RC #136</div>
                <div style={{ fontSize: 6, color: "#64748b" }}>Ask $280 · Free Shipping</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ background: "#22d3a610", border: "1px solid #22d3a635", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 6, fontWeight: 800, color: "#22d3a6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>AI Verdict</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#22d3a6", lineHeight: 1, marginBottom: 1 }}>GRADE IT</div>
                  <div style={{ fontSize: 6.5, color: "#94a3b8" }}>Strong ROI candidate · High confidence</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {[
                    { label: "PSA 10 Probability", value: "74%",   vc: "#00e5ff" },
                    { label: "Est. PSA 10 Value",  value: "$950",  vc: "white"   },
                    { label: "Projected ROI",       value: "+239%", vc: "#22d3a6" },
                    { label: "Grade Confidence",    value: "High",  vc: "#f59e0b" },
                  ].map(({ label, value, vc }) => (
                    <div key={label} style={{ background: "#131c2e", border: "1px solid #1e3a5f40", borderRadius: 5, padding: "5px 6px" }}>
                      <div style={{ fontSize: 6, color: "#64748b", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: vc }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#131c2e", border: "1px solid #1e3a5f40", borderRadius: 5, padding: "5px 7px" }}>
                  <div style={{ fontSize: 6, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>LIVE EBAY COMPS</div>
                  {[["Raw", "$60–$90"], ["PSA 9", "$280–$380"], ["PSA 10", "$850–$1,100"]].map(([g, p]) => (
                    <div key={g} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 6.5, color: "#94a3b8" }}>{g}</span>
                      <span style={{ fontSize: 6.5, color: "white", fontWeight: 700 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradeLabMockup() {
  return (
    <div className="relative select-none pointer-events-none">
      <div className="absolute -inset-4 bg-gradient-to-br from-[#f97316]/8 via-transparent to-primary/5 rounded-3xl blur-xl" />
      <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]" style={{ background: "#0d1117" }}>
        <MockTopBar />
        <div style={{ display: "flex" }}>
          <MockSidebar active="Grade Lab" />
          <div style={{ flex: 1, padding: "10px 12px", background: "#0d1117", minWidth: 0 }}>
            <div style={{ fontSize: 6.5, color: "#f97316", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>AI CARD ANALYSIS</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 8 }}>Grade Lab</div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8 }}>
              <div>
                <div style={{ position: "relative", width: "100%", aspectRatio: "2/3", borderRadius: 6, overflow: "hidden", background: "#0a1628", border: "1px solid #1e3a5f40", marginBottom: 5 }}>
                  <img src={ohtaniImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: "8%", border: "1px dashed #f9731660", borderRadius: 3 }} />
                  <div style={{ position: "absolute", top: "48%", left: "50%", transform: "translate(-50%,-50%)", background: "#0d111790", backdropFilter: "blur(4px)", fontSize: 7, color: "#f97316", fontWeight: 700, padding: "2px 5px", borderRadius: 3 }}>55/45</div>
                  <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#ef444490", border: "1px solid #ef4444" }} />
                </div>
                <div style={{ fontSize: 6.5, fontWeight: 700, color: "white", marginBottom: 1 }}>Ohtani 2021 Prizm Silver</div>
                <div style={{ fontSize: 6, color: "#64748b" }}>Uploaded 2 min ago</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ background: "#131c2e", border: "1px solid #1e3a5f40", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 6, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 5 }}>GRADE PROBABILITY</div>
                  {[
                    { grade: "PSA 10", pct: 74, vc: "#00e5ff", bar: "#00e5ff" },
                    { grade: "PSA 9",  pct: 20, vc: "white",   bar: "#94a3b8" },
                    { grade: "PSA 8",  pct: 6,  vc: "#64748b", bar: "#475569" },
                  ].map(({ grade, pct, vc, bar }) => (
                    <div key={grade} style={{ marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1.5 }}>
                        <span style={{ fontSize: 7, color: vc, fontWeight: 700 }}>{grade}</span>
                        <span style={{ fontSize: 7, color: vc, fontWeight: 900 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: "#0d1117", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: bar, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#131c2e", border: "1px solid #1e3a5f40", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 6, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>DEFECT ANALYSIS</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 5px", background: "#f59e0b12", border: "1px solid #f59e0b25", borderRadius: 4, marginBottom: 3 }}>
                    <AlertTriangle size={8} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontSize: 6.5, color: "#94a3b8", flex: 1 }}>Minor print line — right edge</span>
                    <span style={{ fontSize: 6, color: "#f59e0b", fontWeight: 700 }}>-0.5</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 5px", background: "#22d3a610", border: "1px solid #22d3a625", borderRadius: 4 }}>
                    <CheckCircle2 size={8} style={{ color: "#22d3a6", flexShrink: 0 }} />
                    <span style={{ fontSize: 6.5, color: "#94a3b8", flex: 1 }}>Corners sharp at 10× mag</span>
                    <span style={{ fontSize: 6, color: "#22d3a6", fontWeight: 700 }}>10.0</span>
                  </div>
                </div>
                <div style={{ background: "#00e5ff0d", border: "1px solid #00e5ff30", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 6, fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", marginBottom: 2 }}>RECOMMENDATION</div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#00e5ff", marginBottom: 1 }}>Submit to PSA</div>
                  <div style={{ fontSize: 6, color: "#94a3b8" }}>PSA 10 range $1,200–$1,400 · Fee ~$25</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioMockup() {
  const holdings = [
    { img: mahomesImg,  name: "2017 Prizm Mahomes RC",         grade: "PSA 10", current: "$4,200", pct: "+250%", up: true  },
    { img: wembyImg,    name: "2023-24 Prizm Wembanyama",      grade: "PSA 9",  current: "$950",   pct: "+137%", up: true  },
    { img: charizardImg,name: "1999 Pokémon Base Charizard",   grade: "PSA 8",  current: "$1,100", pct: "+22%",  up: true  },
    { img: ohtaniImg,   name: "2021 Prizm Ohtani Silver RC",   grade: "PSA 10", current: "$420",   pct: "+40%",  up: true  },
  ];
  return (
    <div className="relative select-none pointer-events-none">
      <div className="absolute -inset-4 bg-gradient-to-br from-[#a78bfa]/8 via-transparent to-primary/5 rounded-3xl blur-xl" />
      <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]" style={{ background: "#0d1117" }}>
        <MockTopBar />
        <div style={{ display: "flex" }}>
          <MockSidebar active="Portfolio & Comps" />
          <div style={{ flex: 1, padding: "10px 12px", background: "#0d1117", minWidth: 0 }}>
            <div style={{ fontSize: 6.5, color: "#a78bfa", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>LIVE VALUATIONS</div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "white", lineHeight: 1.1 }}>Portfolio & Comps</div>
              <div style={{ fontSize: 7, fontWeight: 800, color: "#0d1117", background: "#a78bfa", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>+ Add Card</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 8 }}>
              {[
                { label: "Total Value",  value: "$6,670",  vc: "#a78bfa" },
                { label: "Total Gain",   value: "+$3,870", vc: "#22d3a6" },
                { label: "Avg ROI",      value: "+112%",   vc: "#f59e0b" },
              ].map(({ label, value, vc }) => (
                <div key={label} style={{ background: "#131c2e", border: "1px solid #1e3a5f45", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 6, color: "#64748b", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: vc }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#131c2e", border: "1px solid #1e3a5f45", borderRadius: 7, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 42px", padding: "4px 8px", background: "#0d1117", borderBottom: "1px solid #1e3a5f30" }}>
                {["CARD", "GRADE", "VALUE", "ROI"].map(h => (
                  <div key={h} style={{ fontSize: 6, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>
              {holdings.map(({ img, name, grade, current, pct, up }) => (
                <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 42px", padding: "4px 8px", borderBottom: "1px solid #1e3a5f20", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <div style={{ width: 15, height: 20, borderRadius: 2, overflow: "hidden", background: "#0a1628", flexShrink: 0 }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <span style={{ fontSize: 7, color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  </div>
                  <div style={{ fontSize: 7, color: "#94a3b8", fontWeight: 700 }}>{grade}</div>
                  <div style={{ fontSize: 7, color: "white", fontWeight: 700 }}>{current}</div>
                  <div style={{ fontSize: 7, color: up ? "#22d3a6" : "#ef4444", fontWeight: 800 }}>{pct}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dynamic Hero Headline ────────────────────────────────────────────────

const HERO_LINES = [
  { top: "Grade smarter.", gradient: "Deal faster." },
  { top: "Screen deals.", gradient: "In 3 seconds." },
  { top: "Track every card.", gradient: "See every gain." },
];

function DynamicHeroHeadline() {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVis(false);
      setTimeout(() => { setIdx(i => (i + 1) % HERO_LINES.length); setVis(true); }, 320);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const line = HERO_LINES[idx];
  const base: React.CSSProperties = { display: "block", transition: "opacity 0.32s ease, transform 0.32s ease" };
  const inS: React.CSSProperties  = { ...base, opacity: 1, transform: "translateY(0)" };
  const outS: React.CSSProperties = { ...base, opacity: 0, transform: "translateY(-10px)" };

  return (
    <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-6 leading-[0.95] relative z-10">
      <span style={vis ? inS : outS}>{line.top}</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#22d3a6]" style={vis ? inS : outS}>
        {line.gradient}
      </span>
      <span style={{ display: "block" }}>Win more.</span>
    </h1>
  );
}

// ─── Feature Showcase ──────────────────────────────────────────────────────

type ShowcasePos = "tl" | "tr" | "br";

const SHOWCASE_POS: Record<ShowcasePos, React.CSSProperties> = {
  tl: { top: -28, left: -24 },
  tr: { top: -28, right: -24 },
  br: { bottom: 60, right: -24 },
};

const SHOWCASE_DELAYS: Record<ShowcasePos, string> = {
  tl: "0s",
  tr: "0.5s",
  br: "1s",
};

function FloatingStatCard({ label, value, sub, color, pos, show }: {
  label: string; value: string; sub: string; color: string; pos: ShowcasePos; show: boolean;
}) {
  return (
    <div style={{
      position: "absolute", zIndex: 20,
      ...SHOWCASE_POS[pos],
      animation: show ? `showcaseFloat 4s ${SHOWCASE_DELAYS[pos]} ease-in-out infinite` : "none",
    }}>
      <div style={{
        minWidth: 148, borderRadius: 14, padding: "12px 16px",
        background: "rgba(4, 12, 26, 0.92)",
        backdropFilter: "blur(18px)",
        border: `1px solid ${color}35`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 24px ${color}18`,
        opacity: show ? 1 : 0,
        transition: "opacity 0.38s ease",
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1.1, marginBottom: 2 }}>{value}</div>
        <div style={{ fontSize: 9, color: "#94a3b8" }}>{sub}</div>
      </div>
    </div>
  );
}

const SHOWCASE_FEATURES = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    accent: "#00e5ff",
    tagline: "Your AI command center.",
    desc: "Real-time portfolio value, raw deal opportunities, grading ROI, and AI accuracy — all at a glance.",
    cards: [
      { label: "Portfolio Value", value: "$278,420", sub: "↑12.4% this month",   color: "#00e5ff", pos: "tl" as ShowcasePos },
      { label: "Grading ROI",    value: "38.6%",    sub: "Example data",  color: "#22d3a6", pos: "tr" as ShowcasePos },
      { label: "AI Accuracy",    value: "92.7%",    sub: "Example data",   color: "#a78bfa", pos: "br" as ShowcasePos },
    ],
    Mockup: DashboardMockup,
  },
  {
    id: "screener",
    label: "Deal Screener",
    icon: ScanLine,
    accent: "#22d3a6",
    tagline: "Spot winners in seconds.",
    desc: "Paste any eBay URL — AI returns grade probability, live comps, and a Grade It / Pass verdict in under 3 seconds.",
    cards: [
      { label: "AI Verdict",   value: "GRADE IT",   sub: "Strong ROI candidate", color: "#22d3a6", pos: "tl" as ShowcasePos },
      { label: "PSA 10 Prob.", value: "74%",   sub: "Wembanyama RC",        color: "#00e5ff", pos: "tr" as ShowcasePos },
      { label: "Proj. ROI",   value: "+239%", sub: "After grading fees",   color: "#34d399", pos: "br" as ShowcasePos },
    ],
    Mockup: DealScreenerMockup,
  },
  {
    id: "gradelab",
    label: "Grade Lab",
    icon: FlaskConical,
    accent: "#f97316",
    tagline: "Know your grade before you submit.",
    desc: "Upload a scan. AI measures centering, flags defects, and recommends whether to submit to PSA or BGS.",
    cards: [
      { label: "PSA 10 Conf.",  value: "74%",    sub: "Ohtani 2021 Prizm",    color: "#f97316", pos: "tl" as ShowcasePos },
      { label: "Surface Score", value: "9.5/10", sub: "One minor print line", color: "#00e5ff", pos: "tr" as ShowcasePos },
      { label: "PSA 10 Value",  value: "$1,400", sub: "Live eBay comps",      color: "#22d3a6", pos: "br" as ShowcasePos },
    ],
    Mockup: GradeLabMockup,
  },
  {
    id: "portfolio",
    label: "Portfolio & Comps",
    icon: LayoutGrid,
    accent: "#a78bfa",
    tagline: "Track every card's P&L.",
    desc: "Add cards with cost basis, watch live valuations update, and see gain/loss per card with eBay comps.",
    cards: [
      { label: "Total Value", value: "$6,670",  sub: "4 holdings tracked",  color: "#a78bfa", pos: "tl" as ShowcasePos },
      { label: "Total Gain",  value: "+$3,870", sub: "vs cost basis",       color: "#22d3a6", pos: "tr" as ShowcasePos },
      { label: "Avg ROI",     value: "+112%",   sub: "Across all holdings", color: "#f59e0b", pos: "br" as ShowcasePos },
    ],
    Mockup: PortfolioMockup,
  },
];

function FeatureShowcase() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);

  const go = (next: number) => {
    if (next === idx) return;
    setShow(false);
    setTimeout(() => { setIdx(next); setShow(true); }, 320);
  };

  useEffect(() => {
    const t = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx(i => (i + 1) % SHOWCASE_FEATURES.length); setShow(true); }, 320);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const feat = SHOWCASE_FEATURES[idx];

  return (
    <section className="relative overflow-hidden py-24">
      <style>{`
        @keyframes showcaseFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>

      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: "absolute", top: "10%", left: "-5%",
          width: 700, height: 700, borderRadius: "50%",
          background: `radial-gradient(ellipse, ${feat.accent}12 0%, transparent 65%)`,
          filter: "blur(80px)", transition: "background 1s ease",
        }} />
        <div style={{
          position: "absolute", top: "40%", right: "-5%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse, #a78bfa10 0%, transparent 65%)",
          filter: "blur(70px)",
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs text-primary font-black uppercase tracking-widest mb-3">Platform Overview</div>
          <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight text-white mb-4">
            Your full card intelligence suite
          </h2>
          <p className="text-[#64748b] max-w-xl mx-auto text-sm">
            From finding deals to grading cards to managing your portfolio — every tool you need in one command center.
          </p>
        </div>

        {/* Layout: feature tabs left, device right */}
        <div className="grid lg:grid-cols-[300px_1fr] gap-12 items-center">

          {/* Feature selector */}
          <div className="space-y-2 order-2 lg:order-1">
            {SHOWCASE_FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isActive = i === idx;
              return (
                <button
                  key={f.id}
                  onClick={() => go(i)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "14px 16px", borderRadius: 14,
                    border: `1px solid ${isActive ? f.accent + "45" : "#1e3a5f40"}`,
                    background: isActive ? `${f.accent}0b` : "transparent",
                    cursor: "pointer", transition: "all 0.25s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: isActive ? `${f.accent}18` : "#0a162840",
                      border: `1px solid ${isActive ? f.accent + "35" : "#1e3a5f30"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.25s ease",
                    }}>
                      <Icon size={14} style={{ color: isActive ? f.accent : "#64748b" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#fff" : "#94a3b8", transition: "color 0.2s ease", lineHeight: 1.3 }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: 11, color: isActive ? (f.accent + "bb") : "#475569", transition: "color 0.2s ease" }}>
                        {f.tagline}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: f.accent, boxShadow: `0 0 8px ${f.accent}`, flexShrink: 0 }} />
                    )}
                  </div>
                  {isActive && (
                    <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, marginTop: 8, paddingLeft: 42 }}>
                      {f.desc}
                    </p>
                  )}
                </button>
              );
            })}

            {/* Progress dots */}
            <div style={{ display: "flex", gap: 6, paddingTop: 8, paddingLeft: 4 }}>
              {SHOWCASE_FEATURES.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => go(i)}
                  style={{
                    width: i === idx ? 20 : 7, height: 7, borderRadius: 4,
                    background: i === idx ? feat.accent : "#1e3a5f",
                    border: "none", cursor: "pointer", padding: 0,
                    transition: "all 0.3s ease",
                    boxShadow: i === idx ? `0 0 8px ${feat.accent}70` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mockup + floating cards */}
          <div
            className="relative order-1 lg:order-2"
            style={{ paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32 }}
          >
            {feat.cards.map(c => (
              <FloatingStatCard key={`${idx}-${c.pos}`} {...c} show={show} />
            ))}
            <div style={{
              opacity: show ? 1 : 0,
              transform: show ? "scale(1) translateY(0)" : "scale(0.97) translateY(10px)",
              transition: "opacity 0.32s ease, transform 0.32s ease",
            }}>
              <feat.Mockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Hero Cards ───────────────────────────────────────────────────────────

const HERO_CARDS = [
  {
    img: wembyImg,
    aspect: "382 / 500",
    grade: "PSA 9",
    value: "$420",
    player: "Victor Wembanyama",
    team: "San Antonio Spurs · #1 · C",
    set: "2023-24 Panini Prizm Silver RC #136",
    stats: [
      { label: "PPG", value: "21.4" },
      { label: "RPG", value: "10.6" },
      { label: "APG", value: "3.6" },
      { label: "BPG", value: "3.6" },
    ],
    accent: "#00e5ff",
  },
  {
    img: mahomesImg,
    aspect: "1000 / 1640",
    grade: "PSA 10",
    value: "$4,200",
    player: "Patrick Mahomes II",
    team: "Kansas City Chiefs · QB",
    set: "2017 Panini Prizm Silver RC #269",
    stats: [
      { label: "Super Bowls", value: "3×" },
      { label: "Pass YDS", value: "33,912" },
      { label: "Pass TDs", value: "252" },
      { label: "QB Rating", value: "105.2" },
    ],
    accent: "#22d3a6",
  },
  {
    img: charizardImg,
    aspect: "600 / 825",
    grade: "PSA 8",
    value: "$1,100",
    player: "Charizard",
    team: "Fire · Flying · #6",
    set: "1999 Pokémon Base Set Holo #4/102",
    stats: [
      { label: "HP", value: "120" },
      { label: "Fire Spin", value: "100 dmg" },
      { label: "Retreat", value: "3 Energy" },
      { label: "Rarity", value: "Holo Rare" },
    ],
    accent: "#f97316",
  },
];

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function HeroCards() {
  const [flipped, setFlipped] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const handleMouseEnter = (i: number) => setHovered(i);
  const handleMouseLeave = (i: number) => {
    setHovered(null);
    if (flipped === i) setFlipped(null);
  };
  const handleClick = (i: number) => setFlipped(flipped === i ? null : i);

  return (
    <>
      <style>{`
        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes heroPop {
          0% { transform: scale(0) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(-40px); opacity: 0; }
        }
        @keyframes heroParticle {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
      `}</style>
      <div
        className="relative z-10 flex items-end justify-center"
        style={{ gap: "clamp(16px, 4vw, 56px)", paddingLeft: "16px", paddingRight: "16px" }}
      >
        {HERO_CARDS.map((card, i) => {
          const isFlipped = flipped === i;
          const isHovered = hovered === i;
          const isCenter = i === 1;
          // clamp keeps cards fully visible at every viewport size
          const wCss = isCenter ? "clamp(140px, 18vw, 230px)" : "clamp(110px, 14vw, 190px)";

          const restTilt =
            i === 0 ? "rotate(-5deg) translateY(16px)" :
            i === 2 ? "rotate(5deg) translateY(16px)" :
            "translateY(0px)";

          const activeTransform = "translateY(-24px) scale(1.06)";

          return (
            <div
              key={card.player}
              style={{
                position: "relative",
                zIndex: isCenter ? 20 : isHovered ? 15 : 10,
                perspective: "1200px",
                flexShrink: 0,
              }}
              className="cursor-pointer select-none"
              onClick={() => handleClick(i)}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={() => handleMouseLeave(i)}
            >
              {/* Glow bloom behind card */}
              <div
                style={{
                  position: "absolute",
                  inset: "-20px",
                  borderRadius: "24px",
                  background: `radial-gradient(ellipse at 50% 60%, ${card.accent}55 0%, transparent 70%)`,
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.3s ease",
                  pointerEvents: "none",
                  zIndex: 0,
                  animation: isHovered ? "heroGlowPulse 1.8s ease-in-out infinite" : "none",
                }}
              />

              {/* Particle burst on hover */}
              {isHovered && PARTICLE_ANGLES.map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const tx = Math.round(Math.cos(rad) * 55);
                const ty = Math.round(Math.sin(rad) * 55);
                return (
                  <div
                    key={angle}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: card.accent,
                      boxShadow: `0 0 6px ${card.accent}`,
                      "--tx": `${tx}px`,
                      "--ty": `${ty}px`,
                      animation: "heroParticle 0.7s ease-out forwards",
                      pointerEvents: "none",
                      zIndex: 30,
                    } as React.CSSProperties}
                  />
                );
              })}

              {/* Tilt + hover lift wrapper */}
              <div
                style={{
                  width: wCss,
                  aspectRatio: card.aspect,
                  transform: isHovered || isFlipped ? activeTransform : restTilt,
                  transition: "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {/* PSA badge — inside tilt wrapper, moves + rotates with card, hidden when flipped */}
                <div
                  style={{
                    position: "absolute",
                    top: "-30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 31,
                    background: card.accent,
                    color: "#03111c",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "6px 18px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                    boxShadow: `0 0 20px ${card.accent}cc`,
                    opacity: isFlipped ? 0 : 1,
                    pointerEvents: isFlipped ? "none" : "auto",
                    transition: "opacity 0.25s ease, box-shadow 0.3s ease",
                  }}
                >
                  {card.grade} · {card.value}
                </div>
                {/* 3D flip */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    position: "relative",
                  }}
                >
                  {/* FRONT */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden" as React.CSSProperties["WebkitBackfaceVisibility"],
                      borderRadius: "14px",
                      overflow: "hidden",
                      background: "#050914",
                      boxShadow: isHovered
                        ? `0 40px 80px rgba(0,0,0,0.9), 0 0 40px ${card.accent}60`
                        : "0 28px 60px rgba(0,0,0,0.8)",
                      transition: "box-shadow 0.3s ease",
                    }}
                  >
                    <img src={card.img} alt={card.player} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  </div>

                  {/* BACK */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden" as React.CSSProperties["WebkitBackfaceVisibility"],
                      transform: "rotateY(180deg)",
                      borderRadius: "14px",
                      background: "linear-gradient(145deg, #0a1628 0%, #060d1f 100%)",
                      border: `1px solid ${card.accent}60`,
                      boxShadow: `0 40px 80px rgba(0,0,0,0.9), inset 0 0 60px ${card.accent}12`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "16px",
                      gap: "10px",
                    }}
                  >
                    {/* Card identity */}
                    <div>
                      <div style={{ color: card.accent, fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "5px" }}>
                        {card.grade} · {card.value}
                      </div>
                      <div style={{ color: "#fff", fontWeight: 900, fontSize: "15px", lineHeight: 1.2, marginBottom: "3px" }}>{card.player}</div>
                      <div style={{ color: "#64748b", fontSize: "9px", marginBottom: "2px" }}>{card.team}</div>
                      <div style={{ color: "#334155", fontSize: "8px", lineHeight: 1.3 }}>{card.set}</div>
                    </div>

                    {/* Stats 2×2 grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      {card.stats.map((s) => (
                        <div
                          key={s.label}
                          style={{
                            background: `${card.accent}14`,
                            border: `1px solid ${card.accent}30`,
                            borderRadius: "10px",
                            padding: "8px 6px",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px",
                          }}
                        >
                          <div style={{ color: card.accent, fontWeight: 900, fontSize: "13px", lineHeight: 1.1 }}>{s.value}</div>
                          <div style={{ color: "#64748b", fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ textAlign: "center", color: "#334155", fontSize: "8px", paddingBottom: "2px" }}>hover off to flip back</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: FlaskConical, color: "text-[#22d3a6]", bg: "border-[#22d3a6]/20 bg-[#22d3a6]/5", title: "Grade Lab", desc: "Upload card scans. AI detects centering, surface defects, and corner wear — with live eBay comps to back every prediction.", href: "/grade-lab" },
  { icon: ScanLine, color: "text-primary", bg: "border-primary/20 bg-primary/5", title: "AI Deal Screener", desc: "Paste any eBay URL. Get instant grade probability, ROI projection, and a Grade It / Pass verdict in under 3 seconds.", href: "/deal-screener" },
  { icon: LayoutGrid, color: "text-accent", bg: "border-accent/20 bg-accent/5", title: "Portfolio Tracker", desc: "Add every card with cost basis. Watch live valuations update in real time. See your gain/loss per card and overall.", href: "/portfolio" },
  { icon: ShieldCheck, color: "text-[#a78bfa]", bg: "border-[#a78bfa]/20 bg-[#a78bfa]/5", title: "Global Vault", desc: "Secure off-site storage for your highest-value graded slabs. Whale plan feature — contact support for availability and onboarding.", href: "/vault" },
  { icon: ClipboardList, color: "text-[#fb7185]", bg: "border-[#fb7185]/20 bg-[#fb7185]/5", title: "Grading Tracker", desc: "Track every PSA / BGS submission from mailing to return. Know where every card is, every day.", href: "/grading-tracker" },
  { icon: BarChart3, color: "text-[#34d399]", bg: "border-[#34d399]/20 bg-[#34d399]/5", title: "Market Research", desc: "Live market pulse, trending players, and alerts when cards you watch spike or drop in value.", href: "/research" },
  { icon: BookmarkPlus, color: "text-[#38bdf8]", bg: "border-[#38bdf8]/20 bg-[#38bdf8]/5", title: "Wantlist", desc: "Build and manage your want list. Get alerted when cards you're hunting drop to your target price.", href: "/wantlist" },
  { icon: ShoppingCart, color: "text-[#f97316]", bg: "border-[#f97316]/20 bg-[#f97316]/5", title: "Marketplace", desc: "Search eBay, COMC, and private listings in one place. Filter by grade, price, and platform — no tab-switching.", href: "/marketplace" },
];

const STATS = [
  { value: "9", label: "Tools in One Suite" },
  { value: "<3s", label: "Deal Analysis Speed" },
  { value: "PSA · BGS · SGC · CGC", label: "Graders Supported" },
  { value: "Free", label: "Tier, No Card Required" },
];

export default function Landing() {
  usePageMeta(
    "TheCardLab — AI-Powered Sports Card Analytics",
    "Grade smarter. Deal faster. Win more. AI deal screener, grade predictor, portfolio tracker, and market intelligence for sports cards and Pokémon TCG."
  );
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Redirect to={`${basePath}/dashboard`} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#050914] text-[#e2e8f0]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#1e3a5f]/60 bg-[#050914]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[#00bcd4] flex items-center justify-center shadow-[0_0_16px_rgba(0,229,255,0.4)]">
              <FlaskConical size={16} className="text-[#03111c]" />
            </div>
            <span className="font-display font-black text-lg tracking-tight text-white">TheCardLab</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#94a3b8]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <Link href={`${basePath}/pricing`} className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <SignInButton mode="redirect" forceRedirectUrl={`${basePath}/dashboard`}>
              <button className="h-9 px-4 rounded-xl border border-[#1e3a5f] text-[#94a3b8] font-semibold text-sm hover:border-primary/40 hover:text-white transition-all">Sign In</button>
            </SignInButton>
            <SignUpButton mode="redirect" forceRedirectUrl={`${basePath}/dashboard`}>
              <button className="h-9 px-5 rounded-xl bg-primary text-[#03111c] font-black text-sm hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all">Get Started Free</button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <div className="absolute inset-0 -top-16 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[130px]" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-8 relative z-10">
          <Zap size={11} /> AI-Powered Card Intelligence
        </div>
        <DynamicHeroHeadline />
        <p className="text-[#94a3b8] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed relative z-10">
          AI deal screening, centering analysis, live eBay comps, and portfolio tracking for sports cards and Pokémon TCG — all in one command center.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 relative z-10">
          <SignUpButton mode="redirect" forceRedirectUrl={`${basePath}/dashboard`}>
            <button className="h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-[#00bcd4] text-[#03111c] font-black text-lg hover:brightness-110 shadow-[0_10px_40px_rgba(0,229,255,0.35)] transition-all flex items-center gap-2.5 w-full sm:w-auto justify-center">
              Grade Your First Card Free <ArrowRight size={20} />
            </button>
          </SignUpButton>
          <Link href={`${basePath}/pricing`}>
            <button className="h-14 px-8 rounded-2xl border border-[#1e3a5f] text-[#94a3b8] font-semibold text-lg hover:border-primary/40 hover:text-white transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
              View Pricing <ChevronRight size={18} />
            </button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-10 relative z-10">
          <span className="text-sm text-[#475569] flex items-center gap-1.5"><CheckCircle2 size={13} className="text-primary/60" /> No credit card required</span>
          <span className="text-sm text-[#475569] flex items-center gap-1.5"><CheckCircle2 size={13} className="text-primary/60" /> 3 Grade Lab + 5 Deal Screener scans free</span>
          <span className="text-sm text-[#475569] flex items-center gap-1.5"><Smartphone size={13} className="text-primary/60" /> iOS · Android · Desktop PWA</span>
        </div>
      </section>

      {/* Hero cards — full-width, overflow visible, generous padding for badges + lift + shadows */}
      <div style={{ position: "relative", zIndex: 10, paddingTop: "56px", paddingBottom: "80px" }}>
        <HeroCards />
      </div>

      {/* Stats */}
      <section className="border-y border-[#1e3a5f]/60 bg-[#0d1a31]/40">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:divide-x divide-[#1e3a5f]/60">
          {STATS.map(s => (
            <div key={s.label} className="text-center px-4">
              <div className="text-3xl md:text-4xl font-black text-primary mb-1">{s.value}</div>
              <div className="text-xs text-[#64748b] font-bold uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <FeatureShowcase />

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="text-xs text-primary font-black uppercase tracking-widest mb-3">Full Feature Suite</div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white">Every tool you need. One subscription.</h2>
          <p className="text-[#64748b] mt-3 max-w-xl mx-auto text-sm">Nine specialized modules for sports cards and Pokémon TCG, all working together in one command center.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className={`p-5 rounded-2xl border ${f.bg} hover:-translate-y-0.5 transition-all`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-4 ${f.bg}`}>
                <f.icon size={18} className={f.color} />
              </div>
              <h3 className="font-bold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#0a1628]/60 border-y border-[#1e3a5f]/60">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <div className="text-xs text-primary font-black uppercase tracking-widest mb-3">Deal Screener</div>
            <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white">Spot a deal in 3 seconds flat</h2>
            <p className="text-[#64748b] mt-3 max-w-xl mx-auto text-sm">Paste any eBay listing. Our AI parses the card, pulls live comps, estimates grade probability, and returns a Grade It / Pass verdict instantly.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                ["01", "Paste an eBay listing URL", "Grab the URL of any card listing — Buy It Now or auction — and drop it into the Deal Screener."],
                ["02", "AI extracts card details", "The model identifies year, set, player, parallel, condition clues, and asking price from the listing automatically."],
                ["03", "Live comps + grade probability", "Real eBay sold prices for Raw, PSA 8/9/10 are fetched. AI estimates your grade probability from the comp spread."],
                ["04", "Get a Grade It / Pass verdict", "A projected ROI is calculated. If the expected value after grading exceeds the ask, you get a GRADE IT verdict. Simple."],
              ].map(([num, title, desc]) => (
                <div key={num} className="flex gap-5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">{num}</div>
                  <div>
                    <div className="font-bold text-white mb-1 text-sm">{title}</div>
                    <div className="text-xs text-[#64748b] leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div><DealScreenerMockup /></div>
          </div>
        </div>
      </section>

      {/* Grade Lab Feature */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div><GradeLabMockup /></div>
          <div>
            <div className="text-xs text-[#22d3a6] font-black uppercase tracking-widest mb-3">Grade Lab</div>
            <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white mb-5">Know your grade before you submit</h2>
            <div className="space-y-4 text-sm text-[#94a3b8]">
              {[
                ["Centering overlay", "Upload a scan and see precise centering measurements with visual guides."],
                ["Defect detection", "Surface scratches, print lines, and corner wear are flagged with impact scores."],
                ["Live eBay comps", "Raw, PSA 8, PSA 9, and PSA 10 price ranges fetched live so you know the ROI before you pay grading fees."],
                ["Submit recommendation", "AI synthesizes all signals and tells you whether to submit, hold, or sell raw."],
              ].map(([title, desc]) => (
                <div key={title as string} className="flex gap-3">
                  <CheckCircle2 size={16} className="text-[#22d3a6] shrink-0 mt-0.5" />
                  <div><span className="font-bold text-white">{title}</span> — {desc}</div>
                </div>
              ))}
            </div>
            <SignUpButton mode="redirect" forceRedirectUrl={`${basePath}/dashboard`}>
              <button className="mt-8 h-11 px-6 rounded-xl bg-[#22d3a6]/10 border border-[#22d3a6]/30 text-[#22d3a6] font-bold text-sm hover:bg-[#22d3a6]/20 transition-colors flex items-center gap-2">
                Try Grade Lab Free <ArrowRight size={15} />
              </button>
            </SignUpButton>
          </div>
        </div>
      </section>

      {/* Early Access Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs text-primary font-black uppercase tracking-widest mb-3">Early access · Now open</div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white">Built for serious collectors</h2>
          <p className="text-[#64748b] text-sm mt-3 max-w-xl mx-auto">TheCardLab is in active development. Every tool below is live today — not a mockup.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Deal Screener", body: "Paste any eBay URL — AI returns grade probability, live comps, and a Grade It / Pass verdict. Scans run against real sold data.", status: "Live" },
            { title: "Grade Lab", body: "Upload front and back card photos. AI measures centering, flags defects, and predicts PSA/BGS/SGC outcome before you pay grading fees.", status: "Live" },
            { title: "Portfolio & Market", body: "Track every card with cost basis and live valuations. Market Research shows trending players, set movement, and price alerts.", status: "Live" },
          ].map(({ title, body, status }) => (
            <div key={title} className="relative rounded-2xl border border-[#1e3a5f] bg-[#0d1a31] p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wide">{title}</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#22d3a6]/10 border border-[#22d3a6]/20 text-[#22d3a6]">{status}</span>
              </div>
              <p className="text-sm text-[#94a3b8] leading-relaxed flex-1">{body}</p>
              <div className="h-px bg-[#1e3a5f]/60" />
              <p className="text-[11px] text-[#475569]">Free tier available · No credit card required</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-[#0d1a31] to-[#0d1a31] p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/6 blur-[100px] pointer-events-none" />
          <TrendingUp size={32} className="text-primary mx-auto mb-5 relative z-10" />
          <h2 className="text-3xl md:text-5xl font-display font-black text-white mb-5 relative z-10 tracking-tight">
            Ready to trade smarter?
          </h2>
          <p className="text-[#94a3b8] mb-10 max-w-lg mx-auto relative z-10 text-lg">
            Join collectors and investors already using AI to find hidden value, avoid bad buys, and maximise grading ROI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <SignUpButton mode="redirect" forceRedirectUrl={`${basePath}/dashboard`}>
              <button className="h-14 px-10 rounded-2xl bg-primary text-[#03111c] font-black text-lg hover:brightness-110 shadow-[0_10px_40px_rgba(0,229,255,0.3)] transition-all inline-flex items-center gap-2.5">
                Create Free Account <Star size={18} />
              </button>
            </SignUpButton>
            <Link href={`${basePath}/pricing`}>
              <button className="h-14 px-10 rounded-2xl border border-[#1e3a5f] text-[#94a3b8] font-semibold text-lg hover:border-primary/40 hover:text-white transition-all inline-flex items-center gap-2">
                See Pricing <ChevronRight size={18} />
              </button>
            </Link>
          </div>
          <p className="text-xs text-[#475569] mt-6 relative z-10">No credit card required · Free tier always available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e3a5f]/60 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#475569]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-[#00bcd4] flex items-center justify-center"><FlaskConical size={12} className="text-[#03111c]" /></div>
              <span className="font-black text-[#64748b] text-sm">TheCardLab</span>
            </div>
            <p className="text-[#334155]">AI-powered sports card intelligence platform.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {[["Features","#features"],["How It Works","#how-it-works"],["Pricing",`${basePath}/pricing`],["Privacy",`${basePath}/privacy`],["Terms",`${basePath}/terms`],["Support",`${basePath}/support`]].map(([label, href]) => (
              <a key={label} href={href} className="hover:text-[#94a3b8] transition-colors">{label}</a>
            ))}
          </div>
          <span className="text-[#334155]">© {new Date().getFullYear()} TheCardLab</span>
        </div>
      </footer>
    </div>
  );
}
