import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import portfolioRouter from "./portfolio";
import scansRouter from "./scans";
import analyzeListingRouter from "./analyze-listing";
import stripeRouter from "./stripe";
import gradingSubmissionsRouter from "./grading-submissions";
import wantlistRouter from "./wantlist";
import marketRouter from "./market";
import showsRouter from "./shows";
import restorationRouter from "./restoration";
import alertsRouter from "./alerts";
import gradeLabRouter from "./grade-lab";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(portfolioRouter);
router.use(scansRouter);
router.use(analyzeListingRouter);
router.use(stripeRouter);
router.use(gradingSubmissionsRouter);
router.use(wantlistRouter);
router.use(marketRouter);
router.use(showsRouter);
router.use(restorationRouter);
router.use(alertsRouter);
router.use(gradeLabRouter);

export default router;
