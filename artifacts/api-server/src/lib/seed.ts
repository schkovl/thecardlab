import {
  db,
  portfolioHoldingsTable,
  wantlistItemsTable,
  gradingSubmissionsTable,
  scanResultsTable,
} from "@workspace/db";
import { logger } from "./logger";

export async function autoSeed(userId: string): Promise<void> {
  try {
    await db.insert(portfolioHoldingsTable).values([
      { clerkUserId: userId, card: "2003-04 Topps Chrome LeBron James RC #111", grade: "PSA 9", cost: 950, value: 1850, purchaseDate: "2024-02-12" },
      { clerkUserId: userId, card: "2018 Panini Prizm Luka Doncic Silver #280", grade: "PSA 10", cost: 1200, value: 2400, purchaseDate: "2024-03-05" },
      { clerkUserId: userId, card: "2023 Topps Chrome Ohtani Refractor #1", grade: "PSA 9", cost: 230, value: 410, purchaseDate: "2024-05-18" },
    ]);
    await db.insert(wantlistItemsTable).values([
      { clerkUserId: userId, cardName: "1986 Fleer Michael Jordan #57", targetGrade: "PSA 8", maxPrice: 4500, priority: "high" },
      { clerkUserId: userId, cardName: "2009 Bowman Chrome Mike Trout RC", targetGrade: "PSA 10", maxPrice: 1500, priority: "medium" },
    ]);
    await db.insert(gradingSubmissionsTable).values([
      { clerkUserId: userId, cardName: "2023 Prizm Wemby Silver #136", grader: "PSA", serviceLevel: "express", declaredValue: 250, status: "in-grading", submittedDate: "2024-06-15" },
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
        notes: ["Strong corners", "Light centering issue"],
        marketComps: { raw: [180, 240], psa8: [350, 420], psa9: [430, 520], psa10: [800, 1100] },
      },
    ]);
  } catch (err) {
    logger.warn({ err }, "auto-seed failed (non-fatal)");
  }
}
