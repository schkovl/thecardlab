// PATCH: this file replaces the existing artifacts/api-server/src/routes/index.ts.
// The only change is the addition of `entitlementsRouter` (one import + one mount).
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import oauthRouter from "./oauth";
import devRouter from "./dev";
import vaultRouter from "./vault";
import showsRouter from "./shows";
import marketplaceRouter from "./marketplace";
import researchRouter from "./research";
import restorationRouter from "./restoration";
import gradeLabRouter from "./grade-lab";
import portfolioRouter from "./portfolio";
import scansRouter from "./scans";
import analyzeListingRouter from "./analyze-listing";
import stripeRouter from "./stripe";
import gradingSubmissionsRouter from "./grading-submissions";
import wantlistRouter from "./wantlist";
import entitlementsRouter from "./entitlements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(oauthRouter);
router.use(devRouter);
router.use(vaultRouter);
router.use(showsRouter);
router.use(marketplaceRouter);
router.use(researchRouter);
router.use(restorationRouter);
router.use(gradeLabRouter);
router.use(portfolioRouter);
router.use(scansRouter);
router.use(analyzeListingRouter);
router.use(stripeRouter);
router.use(gradingSubmissionsRouter);
router.use(wantlistRouter);
router.use(entitlementsRouter);

export default router;
