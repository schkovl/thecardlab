import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfolioRouter from "./portfolio";
import scansRouter from "./scans";
import analyzeListingRouter from "./analyze-listing";
import stripeRouter from "./stripe";
import gradingSubmissionsRouter from "./grading-submissions";
import wantlistRouter from "./wantlist";
import marketRouter from "./market";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portfolioRouter);
router.use(scansRouter);
router.use(analyzeListingRouter);
router.use(stripeRouter);
router.use(gradingSubmissionsRouter);
router.use(wantlistRouter);
router.use(marketRouter);

export default router;
