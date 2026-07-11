import { Router, type IRouter } from "express";
import { db, marketplaceListingsTable, isCollectibleCategory } from "@workspace/db";
import { getEbayAppToken } from "../lib/ebayComps";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireFeature } from "../middlewares/requireFeature";
import { getAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/marketplace", async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10) || 50, 200);
  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.status, "active"))
    .orderBy(desc(marketplaceListingsTable.createdAt))
    .limit(limit);
  res.json(rows);
});

router.get("/marketplace/external/search", async (req, res) => {
  const q = ((req.query.q as string | undefined) ?? "").trim();
  if (!q) {
    res.json({ data: [], sourceStatus: "empty_query" });
    return;
  }
  // Real external listings only — never fabricate marketplace results.
  const token = await getEbayAppToken();
  if (!token) {
    res.json({
      data: [],
      sourceStatus: "not_configured",
      message: "External marketplace search requires the eBay integration (EBAY_CLIENT_ID + EBAY_CLIENT_SECRET).",
    });
    return;
  }
  try {
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "24");
    url.searchParams.set("category_ids", "212,183454");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
    });
    clearTimeout(timeout);
    if (!r.ok) {
      res.json({ data: [], sourceStatus: "upstream_error" });
      return;
    }
    const body = (await r.json()) as {
      itemSummaries?: Array<{
        itemId?: string;
        title?: string;
        price?: { value?: string };
        shippingOptions?: Array<{ shippingCost?: { value?: string } }>;
        itemWebUrl?: string;
        image?: { imageUrl?: string };
      }>;
    };
    const results = (body.itemSummaries ?? [])
      .filter((i) => i.itemWebUrl && i.title && Number(i.price?.value) > 0)
      .map((i) => ({
        id: i.itemId ?? i.itemWebUrl!,
        source: "ebay" as const,
        card: i.title!,
        grade: /PSA\s*10/i.test(i.title!) ? "PSA 10" : /PSA\s*9/i.test(i.title!) ? "PSA 9" : /BGS\s*9\.5/i.test(i.title!) ? "BGS 9.5" : /PSA|BGS|SGC|CGC/i.test(i.title!) ? "Graded" : "Raw",
        price: Math.round(Number(i.price!.value)),
        shipping: Math.round(Number(i.shippingOptions?.[0]?.shippingCost?.value ?? 0)),
        url: i.itemWebUrl!,
        photo: i.image?.imageUrl ?? null,
      }));
    res.json({ data: results, sourceStatus: "ok" });
  } catch {
    res.json({ data: [], sourceStatus: "upstream_error" });
  }
});

router.get("/my/marketplace-listings", requireAuth, requireFeature("marketplace"), async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.sellerId, userId!))
    .orderBy(desc(marketplaceListingsTable.createdAt));
  res.json(rows);
});

router.post("/marketplace", requireAuth, requireFeature("marketplace"), async (req, res) => {
  const { userId } = getAuth(req);
  const { card, grade, price, shipping, condition, description, photos } = req.body ?? {};
  if (!card || typeof price !== "number") {
    res.status(400).json({ error: "card, price required" });
    return;
  }
  const [row] = await db
    .insert(marketplaceListingsTable)
    .values({
      sellerId: userId!,
      card,
      grade: grade ?? null,
      price,
      shipping: shipping ?? 0,
      condition: condition ?? null,
      description: description ?? null,
      photos: photos ?? null,
      source: "internal",
      status: "active",
      category: isCollectibleCategory(req.body?.category) ? req.body.category : "sports",
      subcategory: typeof req.body?.subcategory === "string" ? req.body.subcategory : null,
    })
    .returning();
  res.json(row);
});

router.put("/marketplace/:id", requireAuth, requireFeature("marketplace"), async (req, res) => {
  const { userId } = getAuth(req);
  const id = req.params.id as string;
  const updates: Record<string, unknown> = {};
  for (const k of ["card", "grade", "price", "shipping", "condition", "description", "photos", "status"] as const) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  updates.updatedAt = new Date();
  const [row] = await db
    .update(marketplaceListingsTable)
    .set(updates)
    .where(and(eq(marketplaceListingsTable.id, id), eq(marketplaceListingsTable.sellerId, userId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/marketplace/:id", requireAuth, requireFeature("marketplace"), async (req, res) => {
  const { userId } = getAuth(req);
  const result = await db
    .delete(marketplaceListingsTable)
    .where(and(eq(marketplaceListingsTable.id, req.params.id as string), eq(marketplaceListingsTable.sellerId, userId!)))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
