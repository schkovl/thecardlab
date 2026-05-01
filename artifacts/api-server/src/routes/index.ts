import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfolioRouter from "./portfolio";
import scansRouter from "./scans";
import analyzeListingRouter from "./analyze-listing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portfolioRouter);
router.use(scansRouter);
router.use(analyzeListingRouter);

export default router;
