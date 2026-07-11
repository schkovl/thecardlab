import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  db,
  usersTable,
  portfolioHoldingsTable,
  wantlistItemsTable,
  gradingSubmissionsTable,
  scanResultsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { TIERS } from "@workspace/entitlements";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth, signToken, setAuthCookie } from "../lib/auth";

const router: IRouter = Router();

const IS_PROD = process.env.NODE_ENV === "production";
const DEV_ROUTES_ALLOWED = !IS_PROD || process.env.ENABLE_DEV_ROUTES === "1";

// Scope the guard to /dev only — an unscoped router.use() here would
// swallow every request for routers mounted after this one.
router.use("/dev", (_req: Request, res: Response, next: NextFunction) => {
  if (!DEV_ROUTES_ALLOWED) {
    res.status(404).json({ error: "not found" });
    return;
  }
  next();
});

router.post("/dev/grant-tier", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const tier = (req.body?.tier as string | undefined)?.toLowerCase();
  if (!tier || !(TIERS as readonly string[]).includes(tier)) {
    res.status(400).json({ error: `tier must be one of: ${TIERS.join(", ")}` });
    return;
  }
  await db.update(usersTable).set({ devTier: tier }).where(eq(usersTable.id, userId!));
  res.json({ ok: true, tier });
});

router.get("/dev/login-as", async (req, res) => {
  const email = (req.query.email as string | undefined)?.trim();
  if (!email) {
    res.status(400).send("email required");
    return;
  }
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = rows[0];
  if (!user) {
    res.status(404).send("user not found");
    return;
  }
  setAuthCookie(res, signToken({ userId: user.id, email: user.email ?? "" }));
  res.redirect("/");
});

router.post("/dev/clear-tier", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  await db.update(usersTable).set({ devTier: null }).where(eq(usersTable.id, userId!));
  res.json({ ok: true });
});

router.post("/dev/seed", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  await db.insert(portfolioHoldingsTable).values([
    { clerkUserId: userId, card: "2003-04 Topps Chrome LeBron James RC #111", grade: "PSA 9", cost: 950, value: 1850, purchaseDate: "2024-02-12" },
    { clerkUserId: userId, card: "2018 Panini Prizm Luka Doncic Silver #280", grade: "PSA 10", cost: 1200, value: 2400, purchaseDate: "2024-03-05" },
    { clerkUserId: userId, card: "2023 Topps Chrome Ohtani Refractor #1", grade: "PSA 9", cost: 230, value: 410, purchaseDate: "2024-05-18" },
    { clerkUserId: userId, card: "1999 Pokemon Base Charizard Holo #4", grade: "PSA 8", cost: 4200, value: 5600, purchaseDate: "2024-01-22" },
  ]);

  await db.insert(wantlistItemsTable).values([
    { clerkUserId: userId, cardName: "1986 Fleer Michael Jordan #57", targetGrade: "PSA 8", maxPrice: 4500, priority: "high" },
    { clerkUserId: userId, cardName: "2003 Bowman Chrome LeBron Refractor RC", targetGrade: "PSA 9", maxPrice: 8000, priority: "high" },
    { clerkUserId: userId, cardName: "2009 Bowman Chrome Mike Trout RC", targetGrade: "PSA 10", maxPrice: 1500, priority: "medium" },
  ]);

  await db.insert(gradingSubmissionsTable).values([
    { clerkUserId: userId, cardName: "2023 Prizm Wemby Silver #136", grader: "PSA", serviceLevel: "express", declaredValue: 250, status: "in-grading", submittedDate: "2024-06-15" },
    { clerkUserId: userId, cardName: "2018 Donruss Optic Luka RC", grader: "BGS", serviceLevel: "economy", declaredValue: 80, status: "graded", gradeReceived: "BGS 9.5", returnedDate: "2024-04-30" },
  ]);

  await db.insert(scanResultsTable).values([
    {
      clerkUserId: userId,
      cardName: "2023 Panini Prizm Wembanyama Silver #136",
      year: "2023",
      setName: "Panini Prizm",
      parallel: "Silver",
      askingPrice: 220,
      shipping: 5,
      estValue: 460,
      estGrade: "PSA 9",
      gradeRange: "PSA 8-9",
      probability: 75,
      roi: 92,
      recommendedAction: "Submit",
      imageQualityScore: 85,
      condition: { centering: { score: 8, status: "Good" }, corners: { score: 9, status: "Excellent" }, edges: { score: 8, status: "Good" }, surface: { score: 9, status: "Excellent" } },
      notes: ["Strong corners", "Light centering issue", "Surface clean"],
      marketComps: { raw: [180, 240], psa8: [350, 420], psa9: [430, 520], psa10: [800, 1100] },
    },
  ]);

  res.json({ ok: true, seeded: { holdings: 4, wantlist: 3, gradingSubmissions: 2, scans: 1 } });
});

export default router;
